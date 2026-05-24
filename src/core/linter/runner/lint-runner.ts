import path from "node:path";
import { Project } from "ts-morph";
import type { Config } from "../../types/index.js";
import type { LintResult, Violation } from "../types.js";
import { resolveRules, type RulesConfig } from "../rules/registry.js";

interface LintRunnerOptionsConfig extends Config {
  exclude?: string[] | undefined;
}

export interface LintRunnerOptions {
  rootPaths: string[];
  rulesConfig: RulesConfig;
  config: LintRunnerOptionsConfig;
  tsConfigFilePath?: string;
}

export async function runLinter(
  options: LintRunnerOptions,
): Promise<LintResult[]> {
  const { rootPaths, rulesConfig, config } = options;

  const project = new Project({
    tsConfigFilePath: path.resolve(
      process.cwd(),
      options.tsConfigFilePath ?? config.tsConfigFilePath,
    ),
    skipAddingFilesFromTsConfig: false,
  });

  const resolvedRules = resolveRules(rulesConfig);

  if (!resolvedRules.length) {
    console.warn(
      "⚠️  No rules configured. Add rules under lint.rules in cplint.config.ts",
    );
    return [];
  }

  // Collect source files under the configured rootPaths
  const sourceFiles = project.getSourceFiles().filter((sf) => {
    const filePath = sf.getFilePath();
    return (
      !filePath.includes("node_modules") &&
      rootPaths.some((root) => filePath.includes(root)) &&
      !options.config.exclude?.some((ex: string) => filePath.includes(ex))
    );
  });

  const results: LintResult[] = [];

  for (const sourceFile of sourceFiles) {
    const violations: Violation[] = [];

    for (const { rule, severity } of resolvedRules) {
      const found = rule.check(sourceFile, config);

      // Apply the user-configured severity (may override rule default)
      for (const violation of found) {
        violations.push({ ...violation, severity });
      }
    }

    if (violations.length) {
      results.push({
        file: sourceFile.getFilePath(),
        violations,
      });
    }
  }

  return results;
}
