import { Command } from "commander";
import { contextGenerator } from "../../tools/context-generator/index.js";

export const contextCommand = new Command("context-generate");

contextCommand
  .requiredOption("-e, --entrypoint <paths...>", "Entrypoint files to analyze")
  .action((options) => contextGenerator(options));
