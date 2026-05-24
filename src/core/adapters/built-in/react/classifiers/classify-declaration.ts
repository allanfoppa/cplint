import { Node, SyntaxKind } from "ts-morph";
import type { Node as MorphNode } from "ts-morph";
import type { Config } from "../../../../types/index.js";

export function classifyDeclaration(
  decl: MorphNode,
  name: string,
  _config: Config,
): string {
  if (Node.isFunctionDeclaration(decl)) {
    if (/^use[A-Z]/.test(name)) return "hook";
    const hasJSX =
      decl.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
      decl.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
    return hasJSX ? "component" : "function";
  }

  if (Node.isVariableDeclaration(decl)) {
    if (/^use[A-Z]/.test(name)) return "hook";
    const init = decl.getInitializer();
    if (init) {
      const hasJSX =
        init.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
        init.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
      if (hasJSX) return "component";
    }
    return "variable";
  }

  if (Node.isInterfaceDeclaration(decl)) return "interface";
  if (Node.isTypeAliasDeclaration(decl)) return "type";
  if (Node.isEnumDeclaration(decl)) return "enum";
  if (Node.isClassDeclaration(decl)) return "class";
  return "unknown";
}
