import { Command } from "commander";
import { runLint } from "../../tools/linter/index.js";

export const lintCommand = new Command("lint");

lintCommand
  .description("Lint .context.ai.yaml files for LLM-consumption anti-patterns")
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
