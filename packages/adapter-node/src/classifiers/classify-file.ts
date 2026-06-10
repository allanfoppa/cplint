import type { SourceFile } from "ts-morph";
import type { FileRole } from "cplint";

const HTTP_FRAMEWORK_MODULES = [
  "express",
  "fastify",
  "hono",
  "@hono/hono",
  "koa",
];

export function classifyNodeFile(file: SourceFile): FileRole {
  const base = file.getBaseNameWithoutExtension().toLowerCase();

  if (base === "main" || base === "index") return "entrypoint";

  // ── Name-suffix heuristics ───────────────────────────────────────────────
  if (base.endsWith(".routes") || base.endsWith(".router")) return "routes";
  if (base.endsWith(".model") || base.endsWith(".models")) return "model";
  if (
    base.endsWith(".util") ||
    base.endsWith(".utils") ||
    base.endsWith(".helper")
  )
    return "util";
  if (base.endsWith(".facade")) return "facade";
  if (base.endsWith(".repository") || base.endsWith(".repo"))
    return "repository";
  if (base.endsWith(".controller")) return "controller";
  if (base.endsWith(".service")) return "service";
  if (base.endsWith(".store")) return "store";
  if (base.endsWith(".hook")) return "hook";
  if (base.endsWith(".page")) return "page";

  // ── Export shape heuristics ──────────────────────────────────────────────
  for (const cls of file.getClasses()) {
    const name = cls.getName() ?? "";
    if (/Facade$/.test(name)) return "facade";
    if (/Repository$|Repo$/.test(name)) return "repository";
    if (/Controller$/.test(name)) return "controller";
    if (/Service$/.test(name)) return "service";
    if (/Store$/.test(name)) return "store";
    if (/Page$/.test(name)) return "page";
  }

  // ── Import-based HTTP framework detection ────────────────────────────────
  const importedModules = file
    .getImportDeclarations()
    .map((i) => i.getModuleSpecifierValue());

  if (importedModules.some((m) => HTTP_FRAMEWORK_MODULES.includes(m))) {
    return "controller";
  }

  // ── Hook pattern ─────────────────────────────────────────────────────────
  for (const fn of file.getFunctions()) {
    if (/^use[A-Z]/.test(fn.getName() ?? "")) return "hook";
  }

  // ── Simple export pattern ────────────────────────────────────────────────
  const exportedFunctions = file.getFunctions().filter((f) => f.isExported());
  if (exportedFunctions.length) return "util";

  return "unknown";
}
