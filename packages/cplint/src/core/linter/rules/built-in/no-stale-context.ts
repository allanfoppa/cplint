import { statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type {
  LintFile,
  LintRule,
  LintSeverity,
  LintViolation,
} from "../../types.js";

/**
 * Warns when the source file has been modified after the context file
 * was last generated.
 *
 * Detection strategy:
 * 1. Read `auto.meta.entry` from the parsed YAML auto block
 * 2. Resolve the source file path relative to the context file
 * 3. Compare source file mtime against `auto.meta.generated` (YYYY-MM-DD)
 *
 * Granularity is intentionally day-level (not ms) to avoid false positives
 * from tooling that touches files without meaningful changes (formatters,
 * git checkout, etc.).
 */
export const noStaleContext: LintRule = {
  name: "no-stale-context",
  severity: "warn",

  run(file: LintFile, severity: LintSeverity): LintViolation[] {
    // ── 1. Extract entry path and generated date from auto.meta ─────────────
    const metaRaw = file.autoBlocks["meta"];
    if (!metaRaw) return [];

    const entryMatch = metaRaw.match(/^entry:\s*(.+)$/m);
    const generatedMatch = metaRaw.match(/^generated:\s*(.+)$/m);

    if (!entryMatch || !generatedMatch) return [];

    const entryPath = entryMatch[1].trim();
    const generatedStr = generatedMatch[1].trim();

    const generatedDate = parseDate(generatedStr);
    if (!generatedDate) return [];

    // ── 2. Resolve source file path ──────────────────────────────────────────
    // entry is relative to the project root (as stored by normalizePath),
    // so resolve from cwd — same as how context-generate runs.
    const sourceFilePath = resolve(process.cwd(), entryPath);

    let sourceMtime: Date;
    try {
      sourceMtime = new Date(statSync(sourceFilePath).mtimeMs);
    } catch {
      // Source file not found — skip silently (may be a deleted file)
      return [];
    }

    // ── 3. Compare at day granularity ────────────────────────────────────────
    const sourceDateStr = toDateString(sourceMtime);

    if (sourceDateStr <= generatedStr) return [];

    return [
      {
        rule: "no-stale-context",
        severity,
        file: file.path,
        message:
          `Context is stale. Source file "${entryPath}" was modified on ${sourceDateStr} ` +
          `but context was last generated on ${generatedStr}. ` +
          `Run: context-generate --entrypoint ${entryPath}`,
      },
    ];
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(str: string): Date | null {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
