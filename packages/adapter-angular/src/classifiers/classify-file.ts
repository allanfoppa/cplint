import { Node } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { FileRole } from "cplint";

// ── Constants & Mappings ────────────────────────────────────────────────────
const GUARD_INTERFACES = [
  "CanActivate",
  "CanMatch",
  "CanDeactivate",
  "CanLoad",
];
const SIGNAL_STORE_FNS = ["signalStore", "createStore", "createFeatureStore"];

const ANGULAR_SUFFIX_ROLE_MAP: Record<string, FileRole> = {
  routes: "routes",
  model: "model",
  models: "model",
  types: "model",
  util: "util",
  utils: "util",
  helper: "util",
  store: "store",
  state: "store",
  component: "component",
  directive: "directive",
  pipe: "pipe",
  service: "service",
  resolver: "service",
  guard: "guard",
  interceptor: "middleware",
  module: "config",
  config: "config",
};

const ARCHITECTURE_PATH_MAP: { segments: string[]; role: FileRole }[] = [
  {
    segments: [
      "/repositories/",
      "/infra/repositories/",
      "/data/repositories/",
      "/gateways/",
    ],
    role: "repository",
  },
  {
    segments: [
      "/usecases/",
      "/use-cases/",
      "/application/use-cases/",
      "/domain/use-cases/",
      "/interactors/",
    ],
    role: "usecase",
  },
  {
    segments: ["/services/", "/core/services/", "/application/services/"],
    role: "service",
  },
  {
    segments: ["/constants/", "/enums/", "/shared/constants/"],
    role: "constants",
  },
  { segments: ["/facades/", "/infrastructure/facades/"], role: "facade" },
  {
    segments: [
      "/models/",
      "/types/",
      "/domain/models/",
      "/entities/",
      "/domain/entities/",
    ],
    role: "model",
  },
  {
    segments: ["/controllers/", "/presenters/", "/adapters/controllers/"],
    role: "controller",
  },
  {
    segments: ["/components/", "/ui/", "/shared/components/", "/widgets/"],
    role: "component",
  },
  { segments: ["/pages/", "/views/", "/screens/", "/features/"], role: "page" },
  {
    segments: ["/store/", "/state/", "/ngrx/", "/stores/", "/signals/"],
    role: "store",
  },
];

export function classifyAngularFile(file: SourceFile): FileRole {
  const filePath = file.getFilePath().toLowerCase();
  const base = file.getBaseNameWithoutExtension().toLowerCase();

  // Skip test, spec, and mock assets from architectural classification
  if (base.includes("spec") || base.includes("test") || base.includes("mock")) {
    return "unknown";
  }

  // 1. Decorator-based Analysis (Class-level heuristics)
  for (const cls of file.getClasses()) {
    const decoratorNames = cls.getDecorators().map((d) => d.getName());

    if (decoratorNames.includes("Component")) {
      const className = cls.getName() ?? "";
      return /Page(Component)?$/.test(className) ||
        base.includes("page") ||
        filePath.includes("/pages/")
        ? "page"
        : "component";
    }

    if (decoratorNames.includes("Directive")) return "directive";
    if (decoratorNames.includes("Pipe")) return "pipe";
    if (decoratorNames.includes("NgModule")) return "config";

    if (decoratorNames.includes("Injectable")) {
      const implemented = cls
        .getImplements()
        .map((i) => i.getExpression().getText());
      if (implemented.some((i) => GUARD_INTERFACES.includes(i))) return "guard";

      const className = cls.getName() ?? "";
      if (/Guard$/.test(className)) return "guard";
      if (/Facade$/.test(className)) return "facade";
      if (/Store$/.test(className)) return "store";
      if (/Repository$/.test(className)) return "repository";

      return "service";
    }
  }

  // 2. Variable Declarations (NgRx SignalStore & Modern Functional Patterns)
  for (const decl of file.getVariableDeclarations()) {
    if (!decl.getVariableStatement()?.isExported()) continue;

    const init = decl.getInitializer();
    if (!init) continue;

    if (Node.isCallExpression(init)) {
      const callName = init.getExpression().getText();
      if (
        SIGNAL_STORE_FNS.includes(callName) ||
        callName === "create" ||
        callName === "atom"
      ) {
        return "store";
      }
    }

    const typeNode = decl.getTypeNode();
    if (typeNode) {
      const typeText = typeNode.getText();
      if (/GuardFn$|ActivateFn$|MatchFn$|DeactivateFn$/.test(typeText))
        return "guard";
      if (typeText.includes("ResolveFn")) return "service";
      if (typeText.includes("HttpInterceptorFn")) return "middleware";
    }
  }

  // 3. Suffix Heuristics
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex !== -1) {
    const suffix = base.slice(dotIndex + 1);
    if (ANGULAR_SUFFIX_ROLE_MAP[suffix]) return ANGULAR_SUFFIX_ROLE_MAP[suffix];
  } else if (ANGULAR_SUFFIX_ROLE_MAP[base]) {
    return ANGULAR_SUFFIX_ROLE_MAP[base];
  }

  // 4. Functional / Architecture Conventions Fallback
  for (const fn of file.getFunctions().filter((f) => f.isExported())) {
    const fnName = fn.getName() ?? "";
    if (/Page$/.test(fnName)) return "page";
    if (/Guard$|Fn$/.test(fnName) && base.includes("guard")) return "guard";
    if (/Interceptor$/.test(fnName)) return "middleware";
  }

  // 5. Structural Path Analysis (Evaluated before generic fallback to protect pure-functional layers)
  const matchedPath = ARCHITECTURE_PATH_MAP.find((mapping) =>
    mapping.segments.some((segment) => filePath.includes(segment)),
  );
  if (matchedPath) return matchedPath.role;

  // 6. Generic Functional Fallback
  if (file.getFunctions().some((f) => f.isExported())) return "util";

  return "unknown";
}
