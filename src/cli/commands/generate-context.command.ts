import { Command } from "commander";

import { contextGenerator } from "../../tools/context-generator/index.js";

export const contextCommand = new Command("context-generate");

contextCommand
  .requiredOption("-e, --entrypoint <paths...>", "Entrypoint files to analyze")
  .option("--no-diagrams", "Skip mermaid diagrams generation to save tokens")
  .action((options) => contextGenerator(options));
