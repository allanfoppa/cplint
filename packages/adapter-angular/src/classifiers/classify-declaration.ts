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
  { regex: /UseCase$|UseCaseActive$/, role: "usecase" },
];

const SIGNAL_STORE_FNS = ["signalStore", "createStore", "createFeatureStore"];

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
  // 1. Class Declarations (Angular Components, Services, and Pure Domain Classes)
  if (Node.isClassDeclaration(decl)) {
    const decoratorNames = decl.getDecorators().map((d) => d.getName());

    if (decoratorNames.includes("Component")) {
      return /Page(Component)?$/.test(name) ? "page" : "component";
    }

    // Match structural decorators (Directive, Pipe, NgModule)
    const matchedDirect = decoratorNames.find((d) => DIRECT_DECORATOR_MAP[d]);
    if (matchedDirect) return DIRECT_DECORATOR_MAP[matchedDirect];

    // Match Injectable services and its architectural sub-roles
    if (decoratorNames.includes("Injectable")) {
      const match = INJECTABLE_SUFFIX_MAP.find((p) => p.regex.test(name));
      return match ? match.role : "service";
    }

    // Fallback for pure/decoupled domain classes (Clean Architecture / Onion style without decorators)
    const pureMatch = INJECTABLE_SUFFIX_MAP.find((p) => p.regex.test(name));
    if (pureMatch) return pureMatch.role;

    return "class";
  }

  // 2. Functional Patterns (Functions & Functional Interceptors/Providers)
  if (Node.isFunctionDeclaration(decl)) {
    if (/Guard$|Fn$/.test(name) && /guard/i.test(name)) return "guard";
    if (/Resolver$/.test(name)) return "service";
    if (/Interceptor$/.test(name)) return "middleware";
    if (/^provide/.test(name)) return "config"; // Matches provider engines like provideMyFeature()

    return "function";
  }

  // 3. Modern Reactive Variables (NgRx SignalStore & Functional Blocks)
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();

    // Detect functional state stores (NgRx SignalStore, Akita, or custom creators)
    if (init && Node.isCallExpression(init)) {
      const callName = init.getExpression().getText();
      if (SIGNAL_STORE_FNS.includes(callName) || callName === "createStore") {
        return "store";
      }
    }

    // Check modern functional type annotations (e.g., const authGuard: CanActivateFn)
    const typeNode = decl.getTypeNode();
    if (typeNode) {
      const typeText = typeNode.getText();
      if (/GuardFn$|ActivateFn$|MatchFn$|DeactivateFn$/.test(typeText))
        return "guard";
      if (typeText.includes("ResolveFn")) return "service";
      if (typeText.includes("HttpInterceptorFn")) return "middleware";
    }

    return "variable";
  }

  // 4. Static Language Structures
  const kind = decl.getKind();
  if (SIMPLE_DECL_MAP[kind]) {
    return SIMPLE_DECL_MAP[kind];
  }

  return "unknown";
}
