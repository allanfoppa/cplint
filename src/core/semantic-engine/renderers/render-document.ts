import { Node } from "ts-morph";
import type { SourceFile, TypeChecker } from "ts-morph";
import { shortType } from "../utils/short-type.js";
import {
  ApiSurfaceRow,
  Config,
  DependencyRow,
  EntryPoint,
  ManualBlocks,
  SemanticContext,
  StateShapeRow,
} from "../types/index.js";
import { extractFieldsFromType } from "../extractors/extract-fields-from-type.js";

export function renderDocument(
  context: SemanticContext,
  config: Config,
  manualBlocks: ManualBlocks,
  sourceFile: SourceFile,
): string {
  const manual = {
    ...config.manualDefaults,
    ...manualBlocks,
  };

  return [
    "<!-- Generated file. Edit only MANUAL blocks. -->",
    "",

    `# ${context.title} context`,

    "",

    "## meta",

    renderAutoBlock("meta", renderMeta(context.meta)),

    renderManualBlock("meta", manual.meta),

    "",

    "## purpose",

    renderManualBlock("purpose", manual.purpose),

    "",

    "## entry-points",

    renderAutoBlock("entry-points", renderEntryPoints(context.entryPoints)),

    "",

    "## api-surface",

    renderAutoBlock("api-surface", renderApiSurface(context.apiSurface)),

    "",

    "## deps",

    renderAutoBlock("deps", renderDeps(context.deps)),

    "",

    "## state-shape",

    renderAutoBlock(
      "state-shape",
      renderStateShape(context.stateShape, sourceFile),
    ),

    "",

    "## critical-flow",

    renderAutoBlock("critical-flow", renderCriticalFlow(context.criticalFlow)),

    "",

    "## decisions",

    renderManualBlock("decisions", manual.decisions),

    "",

    "## constraints",

    renderManualBlock("constraints", manual.constraints),

    "",

    "## known-pitfalls",

    renderManualBlock("known-pitfalls", manual["known-pitfalls"]),

    "",

    "## not-in-scope",

    renderManualBlock("not-in-scope", manual["not-in-scope"]),

    "",

    "## change-checklist",

    renderAutoBlock(
      "change-checklist",
      renderChecklist(context.changeChecklist),
    ),

    "",

    "## open-questions",

    renderManualBlock("open-questions", manual["open-questions"]),

    "",
  ].join("\n");
}

function renderMeta(meta: SemanticContext["meta"]): string {
  return [
    `generated: ${meta.generated}`,
    `entry: ${meta.entry}`,
    "related:",

    ...(meta.related.length
      ? meta.related.map((x) => `  - ${x}`)
      : ["  - none"]),
  ].join("\n");
}

function renderEntryPoints(rows: EntryPoint[]): string {
  if (!rows.length) return "- none";

  return rows.map((row) => `- ${row.name}: ${row.kind}`).join("\n");
}

function renderApiSurface(rows: ApiSurfaceRow[]): string {
  if (!rows.length) return "- none";

  return rows
    .map((row) => `- ${row.name}: ${row.kind} | ${row.type}`)
    .join("\n");
}

function renderDeps(rows: DependencyRow[]): string {
  if (!rows.length) return "- none";

  return rows
    .map((row) => `- ${row.module}: ${row.role} | ${row.symbols.join(", ")}`)
    .join("\n");
}

function renderCriticalFlow(rows: string[]): string {
  if (!rows.length) return "- none";

  return rows.map((row) => `- ${row}`).join("\n");
}

function renderChecklist(rows: string[]): string {
  if (!rows.length) return "- none";

  return rows.map((row) => `- ${row}`).join("\n");
}

function renderAutoBlock(name: string, content: string): string {
  return [
    `<!-- AUTO:START ${name} -->`,
    content || "- none",
    `<!-- AUTO:END ${name} -->`,
  ].join("\n");
}

function renderManualBlock(name: string, content: string): string {
  return [
    `<!-- MANUAL:START ${name} -->`,
    content || "",
    `<!-- MANUAL:END ${name} -->`,
  ].join("\n");
}

function renderStateShape(
  rows: StateShapeRow[],
  sourceFile?: SourceFile,
  checker?: TypeChecker,
): string {
  const stateMap = new Map<string, StateShapeRow>();

  // 1. We populate with what the type extractor has already found (Interfaces/Types)
  rows.forEach((row) => stateMap.set(row.name, row));

  if (sourceFile && checker) {
    // 2. We look into classes (Angular/Inversify/Pure classes)
    const classes = sourceFile.getClasses();
    classes.forEach((clazz) => {
      clazz.getProperties().forEach((prop) => {
        const name = prop.getName();
        const initializer = prop.getInitializer()?.getText() || "";

        // Filtro básico de injeção
        const isInjected =
          prop.getDecorators().some((d) => d.getName() === "Inject") ||
          initializer.includes("inject(");

        if (!isInjected) {
          const type = prop.getType();
          stateMap.set(name, {
            name: `${name}: ${shortType(type.getText(prop))}`,
            fields: extractFieldsFromType(type, prop, checker),
          });
        }
      });
    });

    // 3. We look into variables (React Hooks/NgRx Signals/Zustand)
    // If the map is still empty or it's a functional file, we look into consts
    if (stateMap.size <= rows.length) {
      sourceFile.getVariableDeclarations().forEach((decl) => {
        const initializer = decl.getInitializer();
        if (initializer && Node.isCallExpression(initializer)) {
          const callText = initializer.getExpression().getText();

          // Basic filter for state/store functions (could be improved with more context-specific checks)
          if (
            callText.includes("State") ||
            callText.includes("Store") ||
            callText.includes("create")
          ) {
            const name = decl.getName();
            const type = decl.getType();
            stateMap.set(name, {
              name: `${name}: ${shortType(type.getText(decl))}`,
              fields: extractFieldsFromType(type, decl, checker),
            });
          }
        }
      });
    }
  }

  const finalRows = Array.from(stateMap.values());
  if (!finalRows.length) return "- none";

  return finalRows
    .map((row) => {
      const header = `- ${row.name}`;
      const fields = row.fields.length
        ? row.fields.map((f) => `  - ${f.name}: ${f.type}`).join("\n")
        : "";

      return fields ? `${header}\n${fields}` : header;
    })
    .join("\n");
}
