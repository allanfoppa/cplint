import { Command } from "commander";

import { generateContext } from "../../tools/generate-context/index.js";

export const contextCommand = new Command("generate-context");

contextCommand
  .requiredOption("-e, --entrypoint <paths...>", "Entrypoint files to analyze")
  .option("--no-diagrams", "Skip mermaid diagrams generation to save tokens")
  .action((options) => generateContext(options));
