import { loadConfig } from "../../config/load-config.js";
import { resolveRules } from "../../core/linter/rules/registry.js";
import { runLintRunner } from "../../core/linter/runner/lint-runner.js";
import { report } from "../../core/linter/runner/reporter.js";
import { exitWithError } from "../../core/utils/errors.js";

type LintOptions = {
  format?: "stdout" | "json";
  legacyRules?: boolean;
};

export async function runLint(options: LintOptions = {}): Promise<void> {
  const config = await loadConfig();

  if (!config.lint?.rules || !Object.keys(config.lint.rules).length) {
    exitWithError("NO_RULES_CONFIGURED");
  }

  const rules = resolveRules(options.legacyRules ?? false, config.lint.rules);

  const violations = runLintRunner({
    rootPath: config.rootPath ?? "src/",
    exclude: config.exclude ?? ["node_modules", "dist", ".git"],
    rules,
    format: options.format ?? "stdout",
  });

  const { output, exitCode } = report(violations, options.format ?? "stdout");

  process.stdout.write(output);
  process.exit(exitCode);
}
