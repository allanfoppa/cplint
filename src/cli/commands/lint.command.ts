import { Command } from "commander";
import { runLint } from "../../tools/linter/index.js";

export const lintCommand = new Command("lint");

lintCommand
  .description("Lint source files for LLM-consumption anti-patterns")
  .option(
    "--format <format>",
    "Output format: stdout (default) or json",
    "stdout",
  )
  .action((options) => runLint(options));
