import { readFileSync } from "fs";
import fg from "fast-glob";
import type { LintFile, LintRule, LintViolation } from "../types.js";

function parseContextFile(path: string, content: string): LintFile {
  const manualBlocks: Record<string, string> = {};
  const autoBlocks: Record<string, string> = {};

  const manualRegex =
    /<!-- MANUAL:START ([a-z-]+) -->([\s\S]*?)<!-- MANUAL:END \1 -->/g;
  const autoRegex =
    /<!-- AUTO:START ([a-z-]+) -->([\s\S]*?)<!-- AUTO:END \1 -->/g;

  for (const match of content.matchAll(manualRegex)) {
    manualBlocks[match[1]] = match[2].replace(/^\n/, "").replace(/\n\s*$/, "");
  }
  for (const match of content.matchAll(autoRegex)) {
    autoBlocks[match[1]] = match[2].replace(/^\n/, "").replace(/\n\s*$/, "");
  }

  return { path, content, manualBlocks, autoBlocks };
}

export type LintRunnerOptions = {
  rootPath: string[];
  exclude: string[]; // was "ignore" — aligns with CPLintContextConfig
  rules: LintRule[];
  format: "stdout" | "json";
};

export function runLintRunner(options: LintRunnerOptions): LintViolation[] {
  const patterns = options.rootPath.map((root) => `${root}/**/*.context.ai.md`);

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
