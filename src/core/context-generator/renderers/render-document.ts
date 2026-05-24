import type { SourceFile } from "ts-morph";
import { Config, ManualBlocks, SemanticContext } from "../../types/index.js";
import { renderMeta } from "./render-meta.js";
import { renderEntryPoints } from "./render-entrypoints.js";
import { renderApiSurface } from "./render-api-surface.js";
import { renderDeps } from "./render-deps.js";
import { renderCriticalFlow } from "./render-critical-flow.js";
import { renderChecklist } from "./render-checklist.js";
import { renderAutoBlock, renderManualBlock } from "./render-blocks.js";
import { renderStateShape } from "./render-state-shape.js";

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

    "",

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

    renderAutoBlock("state-shape", renderStateShape(context.stateShape)),

    "",

    "## critical-flow",

    renderAutoBlock(
      "critical-flow",
      renderCriticalFlow(context.criticalFlow, config),
    ),

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
