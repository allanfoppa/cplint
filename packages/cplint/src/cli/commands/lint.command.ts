import { Command } from "commander";
import { runLint } from "../../tools/linter/index.js";

export const lintCommand = new Command("lint")
  .description("Lint .cplint.yaml files for LLM-consumption anti-patterns")
  .option(
    "--format <format>",
    "Output format: stdout (default) or json",
    "stdout",
  )
  .action(async (options) => runLint(options));
