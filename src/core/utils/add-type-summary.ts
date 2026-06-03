import { SyntaxKind } from "ts-morph";
import type {
  Node as MorphNode,
  SourceFile,
  Type,
  TypeChecker,
} from "ts-morph";
import type { FileRole, StateShapeRow } from "../types/index.js";
import { shortType } from "./short-type.js";

// ─── addTypeSummary ───────────────────────────────────────────────────────────

export function addTypeSummary(
  found: Map<string, StateShapeRow>,
  name: string,
  type: Type,
  node: MorphNode,
  checker: TypeChecker,
  config: { maxTypeFields: number },
): void {
  const props = type.getProperties();
  if (!props.length) return;

  const fields = props.slice(0, config.maxTypeFields).map((p) => ({
    name: p.getName(),
    type: shortType(checker.getTypeOfSymbolAtLocation(p, node).getText(node)),
  }));

  found.set(name, { name, fields });
}

// ─── buildSummary ─────────────────────────────────────────────────────────────

export function buildSummary(
  sourceFile: SourceFile,
  role: FileRole,
  _checker: TypeChecker,
): string {
  // ── Store: class-based OR functional (NgRx SignalStore, Zustand…) ────────
  // Must come before isClassRole check because "store" was incorrectly
  // included in CLASS_ROLES — functional stores have no exported class.
  if (role === "store") {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    if (cls) {
      const stateCount = cls
        .getProperties()
        .filter((p) => !p.hasModifier(SyntaxKind.PrivateKeyword)).length;
      return `Exported store class. Manages ${stateCount} state field(s).`;
    }
    return buildFunctionalStoreSummary(sourceFile);
  }

  // ── Angular / Node class-based roles ────────────────────────────────────
  if (isClassRole(role)) {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    if (cls) {
      const publicMethods = cls
        .getMethods()
        .filter((m) => m.getScope() === undefined || m.getScope() === "public");
      return `Exported ${roleLabel(role)}. ${cls.getName() ?? role} with ${publicMethods.length} public method(s).`;
    }
    return `Exported ${roleLabel(role)}.`;
  }

  // ── Component / Page — Angular class or React function ───────────────────
  if (role === "component" || role === "page") {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    if (cls) {
      const publicMethods = cls
        .getMethods()
        .filter((m) => m.getScope() === undefined || m.getScope() === "public");
      return `Exported Angular ${role} class. ${cls.getName() ?? role} with ${publicMethods.length} public method(s).`;
    }
    const fn = sourceFile.getFunctions().find((f) => f.isExported());
    if (fn) {
      const params = buildParamsSummary(fn);
      return `Exported function ${role}. ${params}Returns JSX.`;
    }
    return `Exported ${role}. Returns JSX.`;
  }

  // ── Hook ────────────────────────────────────────────────────────────────
  if (role === "hook") {
    const fn = sourceFile
      .getFunctions()
      .find((f) => /^use[A-Z]/.test(f.getName() ?? ""));
    if (fn) {
      const params = buildParamsSummary(fn);
      const ret = fn.getReturnTypeNode()?.getText() ?? "unknown";
      return `Exported React hook. ${params}Returns \`${ret}\`.`;
    }
    return "Exported React hook.";
  }

  // ── Model ────────────────────────────────────────────────────────────────
  if (role === "model") {
    const names = [
      ...sourceFile.getInterfaces().filter((i) => i.isExported()),
      ...sourceFile.getTypeAliases().filter((t) => t.isExported()),
    ].map((t) => `\`${t.getName()}\``);
    if (names.length) {
      return `Exports ${names.length} type definition(s): ${names.join(", ")}.`;
    }
  }

  // ── Util ─────────────────────────────────────────────────────────────────
  if (role === "util") {
    const fns = sourceFile.getFunctions().filter((f) => f.isExported());
    if (fns.length === 1) {
      const params = buildParamsSummary(fns[0]);
      const ret = fns[0].getReturnTypeNode()?.getText() ?? "unknown";
      return `Exported utility function. ${params}Returns \`${ret}\`.`;
    }
    if (fns.length > 1) {
      return `Exports ${fns.length} utility functions: ${fns
        .map((f) => `\`${f.getName()}\``)
        .join(", ")}.`;
    }
  }

  // ── Guard ────────────────────────────────────────────────────────────────
  if (role === "guard") {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    return `Exported route guard${cls ? ` (${cls.getName()})` : ""}. Controls route access.`;
  }

  // ── Pipe ─────────────────────────────────────────────────────────────────
  if (role === "pipe") {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    return `Exported Angular pipe${cls ? ` (${cls.getName()})` : ""}. Transforms template values.`;
  }

  // ── Routes ───────────────────────────────────────────────────────────────
  if (role === "routes") {
    return "Exported route configuration. Defines navigation structure.";
  }

  // ── Context ──────────────────────────────────────────────────────────────
  if (role === "context") {
    return "Exported React context. Provides shared state to the component tree.";
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  const exportCount = sourceFile.getExportedDeclarations().size;
  return `Exports ${exportCount} symbol(s). Role: ${role}.`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// "store" intentionally excluded — handled separately above
// to support both class-based and functional stores.
const CLASS_ROLES: FileRole[] = [
  "service",
  "facade",
  "repository",
  "controller",
  "directive",
];

function isClassRole(role: FileRole): boolean {
  return CLASS_ROLES.includes(role);
}

function roleLabel(role: FileRole): string {
  const labels: Partial<Record<FileRole, string>> = {
    service: "service class",
    facade: "facade class",
    repository: "repository class",
    controller: "controller class",
    directive: "Angular directive",
  };
  return labels[role] ?? role;
}

function buildFunctionalStoreSummary(sourceFile: SourceFile): string {
  const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of calls) {
    if (call.getExpression().getText() !== "withState") continue;
    const args = call.getArguments();
    if (!args.length) continue;
    const firstArg = args[0];
    if (firstArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const props = (firstArg as any).getProperties?.() ?? [];
      return `Exported functional store. Manages ${props.length} state field(s) via withState.`;
    }
  }
  return "Exported functional store. Manages application state.";
}

function buildParamsSummary(fn: { getParameters: () => any[] }): string {
  try {
    const params = fn.getParameters().map((p: any) => {
      const name = p.getName();
      const type = p.getTypeNode()?.getText() ?? "unknown";
      return `\`${name}: ${type}\``;
    });
    return params.length ? `Receives ${params.join(", ")}. ` : "";
  } catch {
    return "";
  }
}
