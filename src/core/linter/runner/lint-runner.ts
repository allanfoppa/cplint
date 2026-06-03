import { readFileSync } from "fs";
import fg from "fast-glob";
import YAML from "yaml";
import type { LintFile, LintRule, LintViolation } from "../types.js";

function parseContextFile(path: string, content: string): LintFile {
  const manualBlocks: Record<string, string> = {};
  const autoBlocks: Record<string, string> = {};

  try {
    const parsed = YAML.parse(content) as {
      auto?: Record<string, unknown>;
      manual?: Record<string, unknown>;
    };

    if (parsed && typeof parsed.auto === "object") {
      for (const [key, value] of Object.entries(parsed.auto)) {
        autoBlocks[key] =
          typeof value === "object"
            ? YAML.stringify(value).trim()
            : String(value ?? "");
      }
    }

    if (parsed && typeof parsed.manual === "object") {
      for (const [key, value] of Object.entries(parsed.manual)) {
        if (value === null || value === undefined) {
          manualBlocks[key] = "-";
        } else if (
          Array.isArray(value) &&
          (value.length === 0 || value[0] === null)
        ) {
          manualBlocks[key] = "-";
        } else {
          manualBlocks[key] =
            typeof value === "object"
              ? YAML.stringify(value).trim()
              : String(value);
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
  rootPath: string[];
  exclude: string[];
  rules: LintRule[];
  format: "stdout" | "json";
};

export function runLintRunner(options: LintRunnerOptions): LintViolation[] {
  const patterns = options.rootPath.map(
    (root) => `${root}/**/*.context.ai.yaml`,
  );

  const files = patterns.flatMap((pattern) =>
    fg.sync(pattern, { ignore: options.exclude }),
  );

  const allViolations: LintViolation[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf-8");
    const lintFile = parseContextFile(filePath, content);

    for (const rule of options.rules) {
      const violations = rule.run(lintFile);
      allViolations.push(...violations);
    }
  }

  return allViolations;
}
