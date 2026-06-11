import { VariableDeclarationKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { FileRole } from "cplint";

// ── HTTP framework modules ───────────────────────────────────────────────────
const HTTP_FRAMEWORK_MODULES = [
  "express",
  "fastify",
  "hono",
  "@hono/hono",
  "koa",
];

// ── Validation/schema libraries ──────────────────────────────────────────────
const SCHEMA_MODULES = ["zod", "joi", "yup", "ajv", "class-validator"];

// ── Queue/event bus libraries ────────────────────────────────────────────────
const QUEUE_MODULES = [
  "bullmq",
  "bull",
  "amqplib",
  "kafkajs",
  "@nestjs/event-emitter",
  "eventemitter2",
];

// ── Helper: collect all exported arrow-function names ────────────────────────
function getExportedArrowFunctionNames(file: SourceFile): string[] {
  return file
    .getVariableDeclarations()
    .filter((v) => {
      const init = v.getInitializer();
      if (!init) return false;
      const kind = init.getKindName();
      if (kind !== "ArrowFunction") return false;
      // must be part of an exported variable statement
      const stmt = v.getVariableStatement();
      return stmt?.isExported() ?? false;
    })
    .map((v) => v.getName());
}

// ── Helper: file exports only type/interface/enum declarations ───────────────
function isTypeOnlyFile(file: SourceFile): boolean {
  const hasClass = file.getClasses().length > 0;
  const hasFunction = file.getFunctions().length > 0;
  const hasExportedArrow = getExportedArrowFunctionNames(file).length > 0;
  const hasExportedVar = file
    .getVariableDeclarations()
    .some((v) => v.getVariableStatement()?.isExported());
  const hasTypeOrInterface =
    file.getInterfaces().length > 0 || file.getTypeAliases().length > 0;

  return (
    hasTypeOrInterface &&
    !hasClass &&
    !hasFunction &&
    !hasExportedArrow &&
    !hasExportedVar
  );
}

// ── Helper: detect if file looks like a constants/enums file ─────────────────
function isConstantsFile(file: SourceFile): boolean {
  const enums = file.getEnums();
  if (enums.length > 0) return true;

  const exportedVars = file
    .getVariableDeclarations()
    .filter((v) => v.getVariableStatement()?.isExported());

  if (exportedVars.length === 0) return false;

  // All exported vars must be const and non-function
  return exportedVars.every((v) => {
    const stmt = v.getVariableStatement();
    const isConst =
      stmt?.getDeclarationKind() === VariableDeclarationKind.Const;
    const init = v.getInitializer();
    if (!init) return false;
    const kind = init.getKindName();
    return isConst && kind !== "ArrowFunction";
  });
}

// ── Main classifier ──────────────────────────────────────────────────────────
export function classifyNodeFile(file: SourceFile): FileRole {
  const base = file.getBaseNameWithoutExtension().toLowerCase();

  // Strip known suffixes like `.spec`, `.test`, `.e2e` for cleaner matching
  const cleanBase = base
    .replace(/\.(spec|test|e2e)$/, "")
    .replace(/\.(spec|test|e2e)\.[a-z]+$/, "");

  // ── Entrypoint ──────────────────────────────────────────────────────────
  if (cleanBase === "main" || cleanBase === "index") return "entrypoint";

  // ── Name-suffix heuristics ──────────────────────────────────────────────
  if (cleanBase.endsWith(".routes") || cleanBase.endsWith(".router"))
    return "routes";
  if (cleanBase.endsWith(".controller")) return "controller";
  if (cleanBase.endsWith(".service")) return "service";
  if (cleanBase.endsWith(".repository") || cleanBase.endsWith(".repo"))
    return "repository";
  if (cleanBase.endsWith(".facade")) return "facade";
  if (cleanBase.endsWith(".middleware")) return "middleware";
  if (cleanBase.endsWith(".guard")) return "guard";
  if (cleanBase.endsWith(".decorator")) return "decorator";
  if (
    cleanBase.endsWith(".schema") ||
    cleanBase.endsWith(".dto") ||
    cleanBase.endsWith(".validation")
  )
    return "schema";
  if (
    cleanBase.endsWith(".config") ||
    cleanBase.endsWith(".configuration") ||
    cleanBase.endsWith(".env")
  )
    return "config";
  if (
    cleanBase.endsWith(".constants") ||
    cleanBase.endsWith(".constant") ||
    cleanBase.endsWith(".enums") ||
    cleanBase.endsWith(".enum")
  )
    return "constants";
  if (
    cleanBase.endsWith(".types") ||
    cleanBase.endsWith(".type") ||
    cleanBase.endsWith(".interfaces") ||
    cleanBase.endsWith(".interface")
  )
    return "types";
  if (
    cleanBase.endsWith(".event") ||
    cleanBase.endsWith(".handler") ||
    cleanBase.endsWith(".consumer") ||
    cleanBase.endsWith(".producer")
  )
    return "event";
  if (cleanBase.endsWith(".factory")) return "factory";
  if (cleanBase.endsWith(".plugin")) return "plugin";
  if (cleanBase.endsWith(".model") || cleanBase.endsWith(".models"))
    return "model";
  if (cleanBase.endsWith(".store")) return "store";
  if (cleanBase.endsWith(".hook")) return "hook";
  if (cleanBase.endsWith(".page")) return "page";
  if (
    cleanBase.endsWith(".util") ||
    cleanBase.endsWith(".utils") ||
    cleanBase.endsWith(".helper")
  )
    return "util";

  // ── Import analysis ─────────────────────────────────────────────────────
  const importedModules = file
    .getImportDeclarations()
    .map((i) => i.getModuleSpecifierValue());

  const importsHttpFramework = importedModules.some((m) =>
    HTTP_FRAMEWORK_MODULES.includes(m),
  );
  const importsSchema = importedModules.some((m) => SCHEMA_MODULES.includes(m));
  const importsQueue = importedModules.some((m) => QUEUE_MODULES.includes(m));

  // ── Export shape heuristics (classes) ───────────────────────────────────
  for (const cls of file.getClasses()) {
    const name = cls.getName() ?? "";
    if (/Facade$/.test(name)) return "facade";
    if (/Repository$|Repo$/.test(name)) return "repository";
    if (/Controller$/.test(name)) return "controller";
    if (/Service$/.test(name)) return "service";
    if (/Store$/.test(name)) return "store";
    if (/Page$/.test(name)) return "page";
    if (/Factory$/.test(name)) return "factory";
    if (/Guard$/.test(name)) return "guard";
    if (/Middleware$/.test(name)) return "middleware";
    if (/Handler$|Consumer$|Producer$|Listener$/.test(name)) return "event";
    if (/Plugin$/.test(name)) return "plugin";
    if (/Schema$|Dto$/.test(name)) return "schema";
    if (/Config$|Configuration$/.test(name)) return "config";
  }

  // ── Schema/validation imports ────────────────────────────────────────────
  if (importsSchema) return "schema";

  // ── Queue/event imports ──────────────────────────────────────────────────
  if (importsQueue) return "event";

  // ── HTTP framework: only return controller if there are exported handlers ─
  if (importsHttpFramework) {
    const exportedFns = file.getFunctions().filter((f) => f.isExported());
    const exportedArrows = getExportedArrowFunctionNames(file);

    // Middleware pattern: single exported function receiving (req, res, next)
    // or named with "middleware"/"use" prefix
    const allExportedNames = [
      ...exportedFns.map((f) => f.getName() ?? ""),
      ...exportedArrows,
    ];
    const looksLikeMiddleware = allExportedNames.some(
      (n) =>
        /[Mm]iddleware$/.test(n) || /^use[A-Z]/.test(n) || /[Pp]lugin$/.test(n),
    );
    if (looksLikeMiddleware) return "middleware";

    return "controller";
  }

  // ── Hook pattern: named `use*` functions or arrow functions ──────────────
  for (const fn of file.getFunctions()) {
    if (/^use[A-Z]/.test(fn.getName() ?? "")) return "hook";
  }
  for (const name of getExportedArrowFunctionNames(file)) {
    if (/^use[A-Z]/.test(name)) return "hook";
  }

  // ── Type-only file ───────────────────────────────────────────────────────
  if (isTypeOnlyFile(file)) return "types";

  // ── Constants/enums file ─────────────────────────────────────────────────
  if (isConstantsFile(file)) return "constants";

  // ── Simple exported functions → util ─────────────────────────────────────
  const exportedFunctions = file.getFunctions().filter((f) => f.isExported());
  const exportedArrows = getExportedArrowFunctionNames(file);
  if (exportedFunctions.length > 0 || exportedArrows.length > 0) return "util";

  return "unknown";
}
