import { readFileSync } from "fs";
import fg from "fast-glob";
import YAML from "yaml";
import type { LintFile, LintRule, LintViolation } from "../types.js";
import { normalizePath } from "../../utils/normalize-path.js";

const MANUAL_KEYS = new Set([
  "purpose",
  "decisions",
  "constraints",
  "known-pitfalls",
  "not-in-scope",
  "open-questions",
]);

const AUTO_KEYS = new Set([
  "meta",
  "summary",
  "deps",
  "change-checklist",
  "entry-points",
  "api-surface",
  "state-shape",
  "critical-flow",
]);

function parseContextFile(path: string, content: string): LintFile {
  const manualBlocks: Record<string, string> = {};
  const autoBlocks: Record<string, string> = {};

  try {
    const parsed = YAML.parse(content) as Record<string, unknown>;
    if (!parsed) return { path, content, manualBlocks, autoBlocks };

    const global_ = parsed.global as Record<string, unknown> | undefined;

    if (global_ && typeof global_ === "object") {
      for (const [key, value] of Object.entries(global_)) {
        const serialized =
          typeof value === "object"
            ? YAML.stringify(value).trim()
            : String(value ?? "");

        if (MANUAL_KEYS.has(key)) {
          if (value === null || value === undefined) {
            manualBlocks[key] = "-";
          } else if (
            Array.isArray(value) &&
            (value.length === 0 || value[0] === null)
          ) {
            manualBlocks[key] = "-";
          } else {
            manualBlocks[key] = serialized;
          }
        } else if (AUTO_KEYS.has(key)) {
          autoBlocks[key] = serialized;
        }
      }
    }
  } catch (error) {
    console.error(
      `[CPLint] Failed to parse valid YAML at: ${path}. Skipping blocks mapping.`,
      error,
    );
  }

  return { path, content, manualBlocks, autoBlocks };
}

export type LintRunnerOptions = {
  rootPath: string;
  exclude: string[];
  rules: LintRule[];
  format: "stdout" | "json";
};

export function runLintRunner(options: LintRunnerOptions): LintViolation[] {
  const pattern = `${normalizePath(options.rootPath)}/**/*.cplint.yaml`;
  const files = fg.sync(pattern, { ignore: options.exclude });
  const allViolations: LintViolation[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf-8");
    const lintFile = parseContextFile(filePath, content);

    for (const rule of options.rules) {
      const violations = rule.run(lintFile, rule.severity);
      allViolations.push(...violations);
    }
  }

  return allViolations;
}
