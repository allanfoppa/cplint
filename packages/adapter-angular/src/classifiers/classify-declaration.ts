import { Node, SyntaxKind } from "ts-morph";
import type { Node as MorphNode } from "ts-morph";
import type { Config, FileRole } from "cplint";

// ── Declarative Maps ─────────────────────────────────────────────────────────
const DIRECT_DECORATOR_MAP: Record<string, FileRole> = {
  Directive: "directive",
  Pipe: "pipe",
  NgModule: "config",
};

const GUARD_INTERFACES = [
  "CanActivate",
  "CanMatch",
  "CanDeactivate",
  "CanLoad",
];

const INJECTABLE_SUFFIX_MAP: { regex: RegExp; role: FileRole }[] = [
  { regex: /Guard$/, role: "guard" },
  { regex: /Facade$/, role: "facade" },
  { regex: /Store$/, role: "store" },
  { regex: /Repository$/, role: "repository" },
  { regex: /UseCase$|UseCaseActive$/, role: "usecase" },
  { regex: /Mapper$/, role: "mapper" },
  { regex: /Factory$/, role: "factory" },
  { regex: /Converter$/, role: "converter" },
];

const CLASS_SUFFIX_MAP: { regex: RegExp; role: FileRole }[] = [
  ...INJECTABLE_SUFFIX_MAP,
  { regex: /Entity$/, role: "entity" },
  { regex: /Domain$/, role: "domain" },
  { regex: /Event$/, role: "event" },
  { regex: /Schema$/, role: "schema" },
];

const SIGNAL_STORE_FNS = new Set([
  "signalStore",
  "createStore",
  "createFeatureStore",
  "create",
  "atom",
]);

const SIMPLE_DECL_MAP: Record<number, FileRole> = {
  [SyntaxKind.InterfaceDeclaration]: "types",
  [SyntaxKind.TypeAliasDeclaration]: "types",
  [SyntaxKind.EnumDeclaration]: "constants",
};

// ── Main Classifier ──────────────────────────────────────────────────────────
export function classifyDeclaration(
  decl: MorphNode,
  name: string,
  _config: Config,
): FileRole {
  // 1. Class Declarations
  if (Node.isClassDeclaration(decl)) {
    const decoratorNames = decl.getDecorators().map((d) => d.getName());

    if (decoratorNames.includes("Component")) {
      return /Page(Component)?$/.test(name) ? "page" : "component";
    }

    const matchedDirect = decoratorNames.find((d) => DIRECT_DECORATOR_MAP[d]);
    if (matchedDirect) return DIRECT_DECORATOR_MAP[matchedDirect];

    if (decoratorNames.includes("Injectable")) {
      // Check implemented interfaces before falling back to name suffix
      const implemented = decl
        .getImplements()
        .map((i) => i.getExpression().getText());
      if (implemented.some((i) => GUARD_INTERFACES.includes(i))) return "guard";

      const match = INJECTABLE_SUFFIX_MAP.find((p) => p.regex.test(name));
      return match ? match.role : "service";
    }

    // Pure/decoupled domain classes without decorators
    const pureMatch = CLASS_SUFFIX_MAP.find((p) => p.regex.test(name));
    if (pureMatch) return pureMatch.role;

    return "model";
  }

  // 2. Function Declarations
  if (Node.isFunctionDeclaration(decl)) {
    if (/Guard$|GuardFn$/.test(name)) return "guard";
    if (/Interceptor$/.test(name)) return "middleware";
    if (/Resolver$/.test(name)) return "service";
    if (/^provide[A-Z]/.test(name)) return "config";
    if (/Pipe$/.test(name)) return "pipe";

    return "util";
  }

  // 3. Variable Declarations (functional patterns & stores)
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();

    if (init && Node.isCallExpression(init)) {
      const callName = init.getExpression().getText();
      if (SIGNAL_STORE_FNS.has(callName)) return "store";
      if (/^provide[A-Z]/.test(callName)) return "config";
    }

    const typeNode = decl.getTypeNode();
    if (typeNode) {
      const typeText = typeNode.getText();
      if (/CanActivateFn|CanDeactivateFn|CanMatchFn|CanLoadFn/.test(typeText))
        return "guard";
      if (/HttpInterceptorFn/.test(typeText)) return "middleware";
      if (/ResolveFn/.test(typeText)) return "service";
    }

    return "util";
  }

  // 4. Static Language Structures
  const kind = decl.getKind();
  if (SIMPLE_DECL_MAP[kind]) return SIMPLE_DECL_MAP[kind];

  return "unknown";
}
