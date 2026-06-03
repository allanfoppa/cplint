import { SyntaxKind } from "ts-morph";
import type {
  Node as MorphNode,
  SourceFile,
  Type,
  TypeChecker,
} from "ts-morph";
import type { FileRole, StateShapeRow } from "../types/index.js";
import { shortType } from "./short-type.js";

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

export function buildSummary(
  sourceFile: SourceFile,
  role: FileRole,
  _checker: TypeChecker,
): string {
  const hasJSX =
    sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
    sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length >
      0;

  if (role === "component" || role === "page") {
    const fn = sourceFile.getFunctions().find((f) => f.isExported());
    if (fn) {
      const params = buildParamsSummary(fn);
      return `Exported function ${role}. ${params}Returns JSX.`;
    }
    return `Exported ${role}. Returns JSX.`;
  }

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

  if (["service", "facade", "repository", "controller"].includes(role)) {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    if (cls) {
      const methodCount = cls
        .getMethods()
        .filter(
          (m) => m.getScope() === undefined || m.getScope() === "public",
        ).length;
      return `Exported class. Provides ${cls.getName() ?? role} with ${methodCount} public method(s).`;
    }
  }

  if (role === "store") {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    if (cls) {
      const stateCount = cls
        .getProperties()
        .filter((p) => !p.hasModifier(SyntaxKind.PrivateKeyword)).length;
      return `Exported store class. Manages ${stateCount} state field(s).`;
    }
    return "Exported store. Manages application state.";
  }

  if (role === "model") {
    const names = [
      ...sourceFile.getInterfaces().filter((i) => i.isExported()),
      ...sourceFile.getTypeAliases().filter((t) => t.isExported()),
    ].map((t) => `\`${t.getName()}\``);
    return `Exports ${names.length} type definition(s): ${names.join(", ")}.`;
  }

  if (role === "util") {
    const fns = sourceFile.getFunctions().filter((f) => f.isExported());
    if (fns.length === 1) {
      const params = buildParamsSummary(fns[0]);
      const ret = fns[0].getReturnTypeNode()?.getText() ?? "unknown";
      return `Exported utility function. ${params}Returns \`${ret}\`.`;
    }
    if (fns.length > 1) {
      return `Exports ${fns.length} utility functions: ${fns.map((f) => `\`${f.getName()}\``).join(", ")}.`;
    }
  }

  if (role === "guard") {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    return `Exported route guard${cls ? ` (${cls.getName()})` : ""}. Controls route access.`;
  }

  if (role === "pipe") {
    const cls = sourceFile.getClasses().find((c) => c.isExported());
    return `Exported pipe${cls ? ` (${cls.getName()})` : ""}. Transforms template values.`;
  }

  if (role === "routes") {
    return "Exported route configuration. Defines navigation structure.";
  }

  if (role === "context") {
    return "Exported React context. Provides shared state to the component tree.";
  }

  const exportCount = sourceFile.getExportedDeclarations().size;
  return `Exports ${exportCount} symbol(s). Role: ${role}.`;
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
