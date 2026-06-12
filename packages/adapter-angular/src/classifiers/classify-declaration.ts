import { Node, SyntaxKind } from "ts-morph";
import type { Node as MorphNode } from "ts-morph";
import type { Config } from "cplint";

// ── Declarative Class Decorator Maps ────────────────────────────────────────
const DIRECT_DECORATOR_MAP: Record<string, string> = {
  Directive: "directive",
  Pipe: "pipe",
  NgModule: "module",
};

const INJECTABLE_SUFFIX_MAP: { regex: RegExp; role: string }[] = [
  { regex: /Guard$/, role: "guard" },
  { regex: /Facade$/, role: "facade" },
  { regex: /Store$/, role: "store" },
  { regex: /Repository$/, role: "repository" },
];

// ── Declarative Simple Kind Map ─────────────────────────────────────────────
const SIMPLE_DECL_MAP: Record<number, string> = {
  [SyntaxKind.InterfaceDeclaration]: "interface",
  [SyntaxKind.TypeAliasDeclaration]: "type",
  [SyntaxKind.EnumDeclaration]: "enum",
};

// ── Main Classifier ──────────────────────────────────────────────────────────
export function classifyDeclaration(
  decl: MorphNode,
  name: string,
  _config: Config,
): string {
  // 1. Class Declarations (Heavy Angular Structural Decorators)
  if (Node.isClassDeclaration(decl)) {
    const decoratorNames = decl.getDecorators().map((d) => d.getName());

    if (decoratorNames.includes("Component")) {
      return /Page(Component)?$/.test(name) ? "page" : "component";
    }

    // Match simple decorators (Directive, Pipe, NgModule)
    const matchedDirect = decoratorNames.find((d) => DIRECT_DECORATOR_MAP[d]);
    if (matchedDirect) return DIRECT_DECORATOR_MAP[matchedDirect];

    // Match Injectable services and its architectural sub-roles
    if (decoratorNames.includes("Injectable")) {
      const match = INJECTABLE_SUFFIX_MAP.find((p) => p.regex.test(name));
      return match ? match.role : "service";
    }

    return "class";
  }

  // 2. Functional / Modern Angular Patterns (Functions & Arrow Function Variables)
  if (Node.isFunctionDeclaration(decl)) {
    // Angular 14+ functional guards or custom validators naming convention
    if (/Guard$|Fn$/.test(name) && /guard/i.test(name)) return "guard";
    if (/Resolver$/.test(name)) return "service";

    return "function";
  }

  if (Node.isVariableDeclaration(decl)) {
    // Check type annotation for modern functional types (e.g., const myGuard: CanActivateFn = ...)
    const typeNode = decl.getTypeNode();
    if (typeNode) {
      const typeText = typeNode.getText();
      if (/GuardFn$|ActivateFn$|MatchFn$|DeactivateFn$/.test(typeText))
        return "guard";
      if (typeText.includes("ResolveFn")) return "service";
    }

    return "variable";
  }

  // 3. Static Code Structures
  const kind = decl.getKind();
  if (SIMPLE_DECL_MAP[kind]) {
    return SIMPLE_DECL_MAP[kind];
  }

  return "unknown";
}
