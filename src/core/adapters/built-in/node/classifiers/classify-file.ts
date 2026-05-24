import type { SourceFile } from "ts-morph";
import type { FileRole } from "../../../../types/index.js";

/**
 * Classifies a plain TypeScript/Node source file into a FileRole.
 *
 * No framework decorators available — relies on:
 * 1. File name suffix (most reliable)
 * 2. Export shape (class vs function vs const)
 * 3. Content patterns (express Router, repository patterns, etc.)
 */
export function classifyNodeFile(file: SourceFile): FileRole {
  const base = file.getBaseNameWithoutExtension().toLowerCase();

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
  const classes = file.getClasses();
  for (const cls of classes) {
    const name = cls.getName() ?? "";
    if (/Facade$/.test(name)) return "facade";
    if (/Repository$|Repo$/.test(name)) return "repository";
    if (/Controller$/.test(name)) return "controller";
    if (/Service$/.test(name)) return "service";
    if (/Store$/.test(name)) return "store";
    if (/Page$/.test(name)) return "page";
  }

  // ── Content patterns ─────────────────────────────────────────────────────
  const text = file.getFullText();

  // Express / Fastify / Hono router
  if (
    text.includes("express") ||
    text.includes("Router()") ||
    text.includes(".get(") ||
    text.includes(".post(")
  ) {
    return "controller";
  }

  // Functions that look like hooks (useX pattern — used outside React too)
  const functions = file.getFunctions();
  for (const fn of functions) {
    if (/^use[A-Z]/.test(fn.getName() ?? "")) return "hook";
  }

  return "unknown";
}
