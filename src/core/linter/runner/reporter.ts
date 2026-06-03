import type { LintViolation } from "../types.js";

const ICONS: Record<string, string> = {
  error: "✖",
  warn: "⚠",
};

function formatStdout(violations: LintViolation[]): string {
  if (!violations.length) {
    return "✔ No lint violations found.\n";
  }

  const byFile = new Map<string, LintViolation[]>();
  for (const v of violations) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file)!.push(v);
  }

  const lines: string[] = [];
  for (const [file, vs] of byFile) {
    lines.push(`\n${file}`);
    for (const v of vs) {
      const icon = ICONS[v.severity] ?? "·";
      const block = v.block ? ` [${v.block}]` : "";
      lines.push(`  ${icon} ${v.severity}  ${v.rule}${block}`);
      lines.push(`    ${v.message}`);
    }
  }

  const errors = violations.filter((v) => v.severity === "error").length;
  const warns = violations.filter((v) => v.severity === "warn").length;
  lines.push(
    `\n${violations.length} problem(s): ${errors} error(s), ${warns} warning(s)`,
  );

  return lines.join("\n") + "\n";
}

function formatJson(violations: LintViolation[]): string {
  return JSON.stringify(violations, null, 2) + "\n";
}

export function report(
  violations: LintViolation[],
  format: "stdout" | "json",
): { output: string; exitCode: number } {
  const hasErrors = violations.some((v) => v.severity === "error");

  return {
    output:
      format === "json" ? formatJson(violations) : formatStdout(violations),
    exitCode: hasErrors ? 1 : 0,
  };
}
