import { SyntaxKind, VariableDeclarationKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { FileRole } from "cplint";

// ── Declarative Suffix Mapping ──────────────────────────────────────────────
const REACT_SUFFIX_ROLE_MAP: Record<string, FileRole> = {
  routes: "routes",
  router: "routes",
  model: "model",
  types: "types",
  type: "types",
  interfaces: "types",
  interface: "types",
  util: "util",
  utils: "util",
  helper: "util",
  store: "store",
  slice: "store",
  service: "service",
  repository: "repository",
  repo: "repository",
  facade: "facade",
  page: "page",
  hook: "hook",
  component: "component",
  constants: "constants",
  constant: "constants",
  enums: "constants",
  enum: "constants",
  config: "config",
  context: "context",
};

// ── Framework Special File Names (Next.js / Remix) ───────────────────────────
const FRAMEWORK_SPECIAL_NAMES: Record<string, FileRole> = {
  page: "page",
  layout: "component",
  template: "component",
  loading: "component",
  error: "component",
  "not-found": "component",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getExportedArrowFunctionNames(file: SourceFile): string[] {
  return file
    .getVariableDeclarations()
    .filter((v) => {
      const init = v.getInitializer();
      if (init?.getKindName() !== "ArrowFunction") return false;
      return v.getVariableStatement()?.isExported() ?? false;
    })
    .map((v) => v.getName());
}

function isTypeOnlyFile(file: SourceFile): boolean {
  const hasExportedTypes =
    file.getInterfaces().some((i) => i.isExported()) ||
    file.getTypeAliases().some((a) => a.isExported());

  return (
    hasExportedTypes &&
    file.getEnums().length === 0 &&
    file.getClasses().length === 0 &&
    file.getFunctions().length === 0 &&
    getExportedArrowFunctionNames(file).length === 0 &&
    !file
      .getVariableDeclarations()
      .some((v) => v.getVariableStatement()?.isExported())
  );
}

function isConstantsFile(file: SourceFile): boolean {
  if (file.getEnums().some((e) => e.isExported())) return true;

  const exportedVars = file
    .getVariableDeclarations()
    .filter((v) => v.getVariableStatement()?.isExported());

  if (exportedVars.length === 0) return false;

  return exportedVars.every((v) => {
    const isConst =
      v.getVariableStatement()?.getDeclarationKind() ===
      VariableDeclarationKind.Const;
    const isArrow = v.getInitializer()?.getKindName() === "ArrowFunction";
    return isConst && !isArrow;
  });
}

function isBarrelFile(file: SourceFile): boolean {
  return (
    file.getExportDeclarations().length > 0 &&
    file.getClasses().length === 0 &&
    file.getFunctions().length === 0 &&
    file.getInterfaces().length === 0 &&
    file.getTypeAliases().length === 0 &&
    file.getEnums().length === 0 &&
    file
      .getVariableDeclarations()
      .filter((v) => v.getVariableStatement()?.isExported()).length === 0
  );
}

// ── Main Classifier ──────────────────────────────────────────────────────────
export function classifyReactFile(file: SourceFile): FileRole {
  const filePath = file.getFilePath().toLowerCase();
  const base = file.getBaseNameWithoutExtension().toLowerCase();
  const cleanBase = base.replace(/\.(spec|test|e2e)(\.[a-z]+)?$/, "");

  // 1. Early return for tests
  if (base.includes(".spec") || base.includes(".test")) return "unknown";

  // 2. Exact framework file match (Next.js / Remix)
  if (FRAMEWORK_SPECIAL_NAMES[cleanBase])
    return FRAMEWORK_SPECIAL_NAMES[cleanBase];

  // 3. Entrypoint check
  if (cleanBase === "main") return "entrypoint";
  if (cleanBase === "index") {
    if (
      filePath.endsWith("src/index.js") ||
      filePath.endsWith("src/index.tsx") ||
      filePath.endsWith("src/index.ts") ||
      filePath.endsWith("src/main.ts")
    ) {
      return "entrypoint";
    }
    // Barrel re-export — let the rest of the classifier decide
    if (isBarrelFile(file)) return "unknown";
  }

  // 4. Suffix heuristics
  const dotIndex = cleanBase.lastIndexOf(".");
  if (dotIndex !== -1) {
    const suffix = cleanBase.slice(dotIndex + 1);
    if (REACT_SUFFIX_ROLE_MAP[suffix]) return REACT_SUFFIX_ROLE_MAP[suffix];
  } else if (REACT_SUFFIX_ROLE_MAP[cleanBase]) {
    return REACT_SUFFIX_ROLE_MAP[cleanBase];
  }

  // 5. Export shape analysis
  for (const fn of file.getFunctions().filter((f) => f.isExported())) {
    const name = fn.getName() ?? "";
    if (/^use[A-Z]/.test(name)) return "hook";
    if (/Page$/.test(name)) return "page";
  }

  for (const name of getExportedArrowFunctionNames(file)) {
    if (/^use[A-Z]/.test(name)) return "hook";
  }

  // 6. JSX detection
  const hasJSX =
    file.getFirstDescendant((node) => {
      const kind = node.getKind();
      return (
        kind === SyntaxKind.JsxElement ||
        kind === SyntaxKind.JsxSelfClosingElement
      );
    }) !== undefined;

  const usesStyledComponents = file
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .some((decl) => {
      const init = decl.getInitializer();
      if (!init) return false;
      const text = init.getText();
      return text.includes("styled.") || text.startsWith("styled(");
    });

  const isInsideComponents = filePath.includes("/components/");

  if (hasJSX || (isInsideComponents && usesStyledComponents)) {
    const usesRoutingHooks = file
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .some((call) => {
        const name = call.getExpression().getText();
        return name === "useParams" || name === "useSearchParams";
      });

    if (usesRoutingHooks || cleanBase.includes("page") || cleanBase === "app")
      return "page";
    return "component";
  }

  // 7. Context and state store detection
  const hasContextCreation = file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .some((call) => call.getExpression().getText() === "createContext");

  if (hasContextCreation) return "context";

  const isStateManagement = file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .some((call) => {
      const name = call.getExpression().getText();
      return (
        name === "createSlice" ||
        name === "createStore" ||
        name === "create" ||
        name === "useReducer"
      );
    });

  if (isStateManagement) return "store";

  // 8. Structural static analysis
  if (isTypeOnlyFile(file)) return "types";
  if (isConstantsFile(file)) return "constants";

  // 9. Functional fallback
  if (
    file.getFunctions().some((f) => f.isExported()) ||
    getExportedArrowFunctionNames(file).length > 0
  ) {
    return "util";
  }

  return "unknown";
}
