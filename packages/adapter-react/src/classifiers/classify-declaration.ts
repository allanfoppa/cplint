import { Node, SyntaxKind } from "ts-morph";
import type { Node as MorphNode } from "ts-morph";
import type { Config } from "cplint";

// ── Declarative Node Kind Mapping ───────────────────────────────────────────
const SIMPLE_KIND_ROLE_MAP: Record<number, string> = {
  [SyntaxKind.InterfaceDeclaration]: "interface",
  [SyntaxKind.TypeAliasDeclaration]: "type",
  [SyntaxKind.EnumDeclaration]: "enum",
  [SyntaxKind.ClassDeclaration]: "class",
};

/**
 * High-performance check for JSX presence that stops scanning at the first match.
 */
function hasJSXDescendants(node: MorphNode): boolean {
  return (
    node.getFirstDescendant((child) => {
      const kind = child.getKind();
      return (
        kind === SyntaxKind.JsxElement ||
        kind === SyntaxKind.JsxSelfClosingElement
      );
    }) !== undefined
  );
}

/**
 * Resolves the call expression name, handling both direct (memo) and namespaced (React.memo) usage.
 */
function isReactWrapper(exprText: string): boolean {
  return /^(React\.)?(memo|forwardRef)$/.test(exprText);
}

// ── Main Classifier ──────────────────────────────────────────────────────────
export function classifyDeclaration(
  decl: MorphNode,
  name: string,
  _config: Config,
): string {
  // 1. Function Declarations
  if (Node.isFunctionDeclaration(decl)) {
    if (/^use[A-Z]/.test(name)) return "hook";
    return hasJSXDescendants(decl) ? "component" : "function";
  }

  // 2. Variable Declarations (Arrow functions, objects, constants)
  if (Node.isVariableDeclaration(decl)) {
    if (/^use[A-Z]/.test(name)) return "hook";

    const init = decl.getInitializer();
    if (init) {
      if (Node.isCallExpression(init)) {
        const exprText = init.getExpression().getText();
        if (isReactWrapper(exprText)) return "component";
      }

      if (hasJSXDescendants(init)) return "component";
    }
    return "variable";
  }

  // 3. Static Structure Declarations
  const kind = decl.getKind();
  if (SIMPLE_KIND_ROLE_MAP[kind]) {
    return SIMPLE_KIND_ROLE_MAP[kind];
  }

  return "unknown";
}
