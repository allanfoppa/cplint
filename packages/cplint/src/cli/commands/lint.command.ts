import { Command } from "commander";
import { runLint } from "../../tools/linter/index.js";

export const lintCommand = new Command("lint");

lintCommand
  .description("Lint .cplint.yaml files for LLM-consumption anti-patterns")
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
  .option(
    "--strict-roles",
    "Enable prefer-explicit-role rule: warn when role was inferred from export shape instead of filename suffix",
    false,
  )
  .action(async (options) => runLint(options));
