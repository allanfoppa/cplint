import { VariableDeclarationKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { FileRole } from "cplint";

// ── Ecosystem Module Constants ──────────────────────────────────────────────
const HTTP_FRAMEWORK_MODULES = [
  "express",
  "fastify",
  "hono",
  "@hono/hono",
  "koa",
];
const SCHEMA_MODULES = ["zod", "joi", "yup", "ajv", "class-validator"];
const QUEUE_MODULES = [
  "bullmq",
  "bull",
  "amqplib",
  "kafkajs",
  "@nestjs/event-emitter",
  "eventemitter2",
];

// ── Declarative Suffix Mapping ──────────────────────────────────────────────
const SUFFIX_ROLE_MAP: Record<string, FileRole> = {
  routes: "routes",
  router: "routes",
  controller: "controller",
  service: "service",
  repository: "repository",
  repo: "repository",
  useCase: "usecase",
  facade: "facade",
  middleware: "middleware",
  guard: "guard",
  command: "command",
  decorator: "decorator",
  domain: "domain",
  mapper: "mapper",
  converter: "converter",
  schema: "schema",
  cron: "cron",
  query: "query",
  dto: "schema",
  validation: "schema",
  config: "config",
  configuration: "config",
  env: "config",
  constants: "constants",
  constant: "constants",
  enums: "constants",
  enum: "constants",
  types: "types",
  type: "types",
  interfaces: "types",
  interface: "types",
  event: "event",
  handler: "event",
  consumer: "event",
  producer: "event",
  factory: "factory",
  plugin: "plugin",
  model: "model",
  models: "model",
  store: "store",
  hook: "hook",
  page: "page",
  util: "util",
  utils: "util",
  helper: "util",
};

// ── Declarative Class Pattern Mapping ───────────────────────────────────────
const CLASS_PATTERNS: { regex: RegExp; role: FileRole }[] = [
  { regex: /Facade$/, role: "facade" },
  { regex: /Repository$|Repo$/, role: "repository" },
  { regex: /Controller$/, role: "controller" },
  { regex: /Service$/, role: "service" },
  { regex: /Store$/, role: "store" },
  { regex: /Page$/, role: "page" },
  { regex: /Factory$/, role: "factory" },
  { regex: /Guard$/, role: "guard" },
  { regex: /Middleware$/, role: "middleware" },
  { regex: /Handler$|Consumer$|Producer$|Listener$/, role: "event" },
  { regex: /Plugin$/, role: "plugin" },
  { regex: /Schema$|Dto$/, role: "schema" },
  { regex: /Config$|Configuration$/, role: "config" },
];

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

// ── Main classifier ──────────────────────────────────────────────────────────
export function classifyNodeFile(file: SourceFile): FileRole {
  const base = file.getBaseNameWithoutExtension().toLowerCase();

  // 1. Entrypoint Check
  if (base === "main" || base === "index") return "entrypoint";

  // 2. Suffix Heuristics
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex !== -1) {
    const suffix = base.slice(dotIndex + 1);
    if (SUFFIX_ROLE_MAP[suffix]) return SUFFIX_ROLE_MAP[suffix];
  }

  // 3. Import analysis setup
  const importedModules = file
    .getImportDeclarations()
    .map((i) => i.getModuleSpecifierValue());
  const importsHttpFramework = importedModules.some((m) =>
    HTTP_FRAMEWORK_MODULES.includes(m),
  );

  if (importedModules.some((m) => SCHEMA_MODULES.includes(m))) return "schema";
  if (importedModules.some((m) => QUEUE_MODULES.includes(m))) return "event";

  // 4. Export shape heuristics (Classes matching optimized pre-defined regex)
  for (const cls of file.getClasses()) {
    const className = cls.getName() ?? "";
    const match = CLASS_PATTERNS.find((p) => p.regex.test(className));
    if (match) return match.role;
  }

  // 5. HTTP framework contextual analysis
  if (importsHttpFramework) {
    const hasMiddlewareName = [
      ...file
        .getFunctions()
        .filter((f) => f.isExported())
        .map((f) => f.getName() ?? ""),
      ...getExportedArrowFunctionNames(file),
    ].some(
      (name) =>
        /[Mm]iddleware$/.test(name) ||
        /^use[A-Z]/.test(name) ||
        /[Pp]lugin$/.test(name),
    );

    return hasMiddlewareName ? "middleware" : "controller";
  }

  // 6. Structural Static Analysis
  if (isTypeOnlyFile(file)) return "types";
  if (isConstantsFile(file)) return "constants";

  // 7. Fallback to general functional utility
  const allExportedFnNames = [
    ...file
      .getFunctions()
      .filter((f) => f.isExported())
      .map((f) => f.getName() ?? ""),
    ...getExportedArrowFunctionNames(file),
  ];

  if (allExportedFnNames.some((n) => /^use[A-Z]/.test(n))) return "hook";

  if (allExportedFnNames.length > 0) return "util";

  return "unknown";
}
