import { Node, SyntaxKind } from "ts-morph";
import type { Node as MorphNode } from "ts-morph";
import type { Config } from "cplint";

function hasJSXDescendants(node: MorphNode): boolean {
  return (
    node.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
    node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0
  );
}

export function classifyDeclaration(
  decl: MorphNode,
  name: string,
  _config: Config,
): string {
  if (Node.isFunctionDeclaration(decl)) {
    if (/^use[A-Z]/.test(name)) return "hook";
    return hasJSXDescendants(decl) ? "component" : "function";
  }

  if (Node.isVariableDeclaration(decl)) {
    if (/^use[A-Z]/.test(name)) return "hook";
    const init = decl.getInitializer();
    if (init) {
      // unwrap React.memo(…) e React.forwardRef(…)
      if (Node.isCallExpression(init)) {
        const expr = init.getExpression().getText();
        if (/^React\.(memo|forwardRef)$/.test(expr)) return "component";
      }
      if (hasJSXDescendants(init)) return "component";
    }
    return "variable";
  }

  if (Node.isInterfaceDeclaration(decl)) return "interface";
  if (Node.isTypeAliasDeclaration(decl)) return "type";
  if (Node.isEnumDeclaration(decl)) return "enum";
  if (Node.isClassDeclaration(decl)) return "class";
  return "unknown";
}
