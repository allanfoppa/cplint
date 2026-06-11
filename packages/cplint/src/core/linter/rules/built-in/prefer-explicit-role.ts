import { basename } from "node:path";
import type { FileRole } from "../../../types/index.js";
import type {
  LintFile,
  LintRule,
  LintSeverity,
  LintViolation,
} from "../../types.js";

/**
 * Warns when a file's role was resolved by export-shape fallback rather than
 * an explicit filename suffix or class name convention.
 *
 * Detection strategy:
 * 1. Read `auto.meta.role` and `auto.meta.entry` from the parsed YAML meta block
 * 2. Validate the role value against the known FileRole union
 * 3. Check if the filename contains a suffix that explicitly declares that role
 * 4. If no suffix matches → the role was inferred by shape fallback → warn
 *
 * Rationale: heuristic classification (e.g. "exported function → util") is
 * unreliable. A `windowTitle.ts` that mutates `document.title` looks like a
 * util but is semantically a store. Explicit suffixes (`.store.ts`) are the
 * only reliable signal.
 */
export const preferExplicitRole: LintRule = {
  name: "prefer-explicit-role",
  severity: "warn",

  run(file: LintFile, severity: LintSeverity): LintViolation[] {
    // ── 1. Extract role and entry from auto.meta block ───────────────────────
    const metaRaw = file.autoBlocks["meta"];
    if (!metaRaw) return [];

    const roleMatch = metaRaw.match(/^role:\s*(.+)$/m);
    const entryMatch = metaRaw.match(/^entry:\s*(.+)$/m);
    if (!roleMatch || !entryMatch) return [];

    const rawRole = roleMatch[1].trim();

    // ── 2. Validate against known FileRole values ────────────────────────────
    if (!isFileRole(rawRole)) return []; // stale/corrupted YAML — skip silently
    const role: FileRole = rawRole;

    // "unknown" has its own semantics — skip, let other rules handle it
    if (role === "unknown") return [];

    const entryPath = entryMatch[1].trim();
    const base = basename(entryPath)
      .replace(/\.(ts|tsx|js|jsx|mts|cts)$/, "")
      .toLowerCase();

    // ── 3. Check if any known suffix covers this role ────────────────────────
    if (hasSuffixForRole(base, role)) return [];

    // ── 4. Emit violation ────────────────────────────────────────────────────
    const suggestedSuffix = SUGGESTED_SUFFIX[role];
    const suggestion = suggestedSuffix
      ? ` Consider renaming to use the ".${suggestedSuffix}.ts" suffix.`
      : "";

    return [
      {
        rule: "prefer-explicit-role",
        severity,
        file: file.path,
        message:
          `Role "${role}" was inferred from export shape, not from a filename suffix. ` +
          `This may be incorrect (e.g. a state-mutating function misclassified as "util").` +
          suggestion,
      },
    ];
  },
};

// ─── FileRole runtime validation ─────────────────────────────────────────────

const FILE_ROLES = new Set<string>([
  "schema",
  "decorator",
  "middleware",
  "entrypoint",
  "guard",
  "facade",
  "store",
  "context",
  "service",
  "component",
  "page",
  "hook",
  "controller",
  "repository",
  "pipe",
  "directive",
  "routes",
  "model",
  "util",
  "unknown",
  "constants",
  "event",
  "factory",
  "plugin",
  "config",
  "types",
]);

function isFileRole(value: string): value is FileRole {
  return FILE_ROLES.has(value);
}

// ─── Role → accepted suffixes ─────────────────────────────────────────────────

const ROLE_SUFFIXES: Partial<Record<FileRole, string[]>> = {
  routes: [".routes", ".router"],
  controller: [".controller"],
  service: [".service"],
  repository: [".repository", ".repo"],
  facade: [".facade"],
  middleware: [".middleware"],
  guard: [".guard"],
  decorator: [".decorator"],
  schema: [".schema", ".dto", ".validation"],
  config: [".config", ".configuration", ".env"],
  constants: [".constants", ".constant", ".enums", ".enum"],
  types: [".types", ".type", ".interfaces", ".interface"],
  event: [".event", ".handler", ".consumer", ".producer"],
  factory: [".factory"],
  plugin: [".plugin"],
  model: [".model", ".models"],
  store: [".store"],
  hook: [".hook"],
  page: [".page"],
  util: [".util", ".utils", ".helper"],
  component: [".component"],
  directive: [".directive"],
  pipe: [".pipe"],
  // entrypoint → always "main" or "index", no suffix needed
  // unknown    → handled before this point
};

// The most idiomatic suffix to suggest in the violation message
const SUGGESTED_SUFFIX: Partial<Record<FileRole, string>> = {
  routes: "routes",
  controller: "controller",
  service: "service",
  repository: "repository",
  facade: "facade",
  middleware: "middleware",
  guard: "guard",
  decorator: "decorator",
  schema: "schema",
  config: "config",
  constants: "constants",
  types: "types",
  event: "event",
  factory: "factory",
  plugin: "plugin",
  model: "model",
  store: "store",
  hook: "hook",
  page: "page",
  util: "util",
  component: "component",
  directive: "directive",
  pipe: "pipe",
};

function hasSuffixForRole(base: string, role: FileRole): boolean {
  if (role === "entrypoint") return true;

  const accepted = ROLE_SUFFIXES[role];
  if (!accepted) return true; // role has no suffix convention — not our problem

  return accepted.some((suffix) => base.endsWith(suffix));
}
