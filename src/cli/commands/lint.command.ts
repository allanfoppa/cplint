import { Command } from "commander";
import { loadConfig } from "../../config/load-config.js";
import { resolveRules } from "../../core/linter/rules/registry.js";
import { runLintRunner } from "../../core/linter/runner/lint-runner.js";
import { report } from "../../core/linter/runner/reporter.js";
import { runLint } from "../../tools/linter/index.js";

export const lintCommand = new Command("lint");

lintCommand
  .description("Lint .context.ai.md files for LLM-consumption anti-patterns")
  .option(
    "--format <format>",
    "Output format: stdout (default) or json",
    "stdout",
  )
  .option(
    "--legacy-rules",
    "Include legacy rule aliases (e.g. no-empty-purpose)",
    false,
  )
  .action(async (options) => runLint(options));
