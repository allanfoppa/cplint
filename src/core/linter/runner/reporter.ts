import type { LintResult, Violation } from "../types.js";

const ICONS: Record<string, string> = {
  error: "✖",
  warn: "⚠",
  info: "ℹ",
};

const COLORS: Record<string, string> = {
  error: "\x1b[31m", // red
  warn: "\x1b[33m", // yellow
  info: "\x1b[36m", // cyan
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// ─── Stdout Reporter ─────────────────────────────────────────────────────────

export function reportToStdout(results: LintResult[]): void {
  if (!results.length) {
    console.log(`\n${COLORS.bold}✔ No violations found.${COLORS.reset}\n`);
    return;
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    const relativePath = toRelative(result.file);
    console.log(`\n${COLORS.bold}${relativePath}${COLORS.reset}`);

    for (const v of result.violations) {
      const color = COLORS[v.severity] ?? COLORS.reset;
      const icon = ICONS[v.severity] ?? "•";
      const line = v.line ? `${COLORS.dim}:${v.line}${COLORS.reset}` : "";

      console.log(
        `  ${color}${icon}${COLORS.reset}${line}  ${v.message}  ${COLORS.dim}[${v.ruleId}]${COLORS.reset}`,
      );

      if (v.severity === "error") totalErrors++;
      if (v.severity === "warn") totalWarnings++;
    }
  }

  const summary = [
    totalErrors
      ? `${COLORS.error}${totalErrors} error${totalErrors > 1 ? "s" : ""}${COLORS.reset}`
      : "",
    totalWarnings
      ? `${COLORS.warn}${totalWarnings} warning${totalWarnings > 1 ? "s" : ""}${COLORS.reset}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  console.log(`\n${summary}\n`);
}

// ─── JSON Reporter ────────────────────────────────────────────────────────────

export function reportToJson(results: LintResult[]): string {
  return JSON.stringify(results, null, 2);
}

// ─── Exit Code ───────────────────────────────────────────────────────────────

export function getExitCode(results: LintResult[]): number {
  const hasErrors = results.some((r) =>
    r.violations.some((v) => v.severity === "error"),
  );
  return hasErrors ? 1 : 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toRelative(filePath: string): string {
  return filePath.replace(process.cwd(), ".").replace(/\\/g, "/");
}
