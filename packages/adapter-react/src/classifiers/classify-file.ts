import { SyntaxKind, VariableDeclarationKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { FileRole } from "cplint";

// ── Declarative Suffix Mapping ──────────────────────────────────────────────
const REACT_SUFFIX_ROLE_MAP: Record<string, FileRole> = {
  routes: "routes",
  router: "routes",
  model: "model",
  types: "model",
  type: "model",
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
};

// ── Framework Specific File Names (Next.js / Remix) ─────────────────────────
const FRAMEWORK_SPECIAL_NAMES: Record<string, FileRole> = {
  page: "page",
  layout: "component",
  template: "component",
  loading: "component",
  error: "component",
  "not-found": "component",
};
export function classifyReactFile(file: SourceFile): FileRole {
  const filePath = file.getFilePath().toLowerCase();
  const base = file.getBaseNameWithoutExtension().toLowerCase();
  const cleanBase = base.replace(/\.(spec|test|e2e)(\.[a-z]+)?$/, "");

  // 1. Early Return for Tests
  if (base.includes(".spec") || base.includes(".test")) return "unknown";

  // 2. Exact Framework File Match (e.g., page.tsx, layout.tsx)
  if (FRAMEWORK_SPECIAL_NAMES[cleanBase])
    return FRAMEWORK_SPECIAL_NAMES[cleanBase];

  // ── NEW: Contextual Path Analysis (Blinds against generic names) ──────────
  const isInsideComponents = filePath.includes("/components/");
  const isInsideServices = filePath.includes("/services/");
  const isInsideConstants = filePath.includes("/constants/");

  // 3. Contextual Index / Barrel Files Check
  if (cleanBase === "index") {
    // If it's the main root index, it's an entrypoint
    if (
      filePath.endsWith("src/index.js") ||
      filePath.endsWith("src/index.tsx") ||
      filePath.endsWith("src/main.ts")
    ) {
      return "entrypoint";
    }
    // If it's an index.js inside a components/services folder, it's a barrel file (classify as util)
    return "util";
  }

  // 4. Suffix Heuristics (O(1) Lookup)
  const dotIndex = cleanBase.lastIndexOf(".");
  if (dotIndex !== -1) {
    const suffix = cleanBase.slice(dotIndex + 1);
    if (REACT_SUFFIX_ROLE_MAP[suffix]) return REACT_SUFFIX_ROLE_MAP[suffix];
  }

  // 5. Export Shape Analysis
  for (const fn of file.getFunctions().filter((f) => f.isExported())) {
    const name = fn.getName() ?? "";
    if (/^use[A-Z]/.test(name)) return "hook";
    if (/Page$/.test(name)) return "page";
  }

  // 6. High-Performance AST Structure Checks
  const hasJSX =
    file.getFirstDescendant((node) => {
      const kind = node.getKind();
      return (
        kind === SyntaxKind.JsxElement ||
        kind === SyntaxKind.JsxSelfClosingElement
      );
    }) !== undefined;

  // ── NEW: Styled Components / CSS-in-JS Detection ──────────────────────────
  const usesStyledComponents = file
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .some((decl) => {
      const init = decl.getInitializer();
      if (!init) return false;
      // Detects: const Title = styled.h1`...` or styled(Component)`...`
      return (
        init.getText().includes("styled.") ||
        init.getText().startsWith("styled(")
      );
    });

  if (hasJSX || (isInsideComponents && usesStyledComponents)) {
    const usesRoutingHooks = file
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .some((call) => {
        const name = call.getExpression().getText();
        return name === "useParams" || name === "useSearchParams";
      });

    if (usesRoutingHooks || cleanBase.includes("page") || base === "app")
      return "page";
    return "component";
  }

  // 7. Context and State Store Logic
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

  // ── NEW: Fallback heuristics based on folder structure & naming convention ──
  if (isInsideConstants || isConstantsFile(file)) return "constants";

  if (isInsideServices || /^fetch|^get|^post|^request/.test(cleanBase)) {
    return "service";
  }

  if (isTypeOnlyFile(file)) return "types";

  // 8. Fallback to general functional utility
  if (
    file.getFunctions().some((f) => f.isExported()) ||
    getExportedArrowFunctionNames(file).length > 0
  ) {
    return "util";
  }

  return "unknown";
}

// ── Helper: collect all exported arrow-function names ────────────────────────
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

// ── Helper: file exports only type/interface/enum declarations ───────────────
function isTypeOnlyFile(file: SourceFile): boolean {
  return (
    (file.getInterfaces().length > 0 || file.getTypeAliases().length > 0) &&
    file.getClasses().length === 0 &&
    file.getFunctions().length === 0 &&
    getExportedArrowFunctionNames(file).length === 0 &&
    !file
      .getVariableDeclarations()
      .some((v) => v.getVariableStatement()?.isExported())
  );
}

// ── Helper: detect if file looks like a constants/enums file ─────────────────
function isConstantsFile(file: SourceFile): boolean {
  if (file.getEnums().length > 0) return true;

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
