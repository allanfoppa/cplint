import { Command } from "commander";

import { generateContext } from "../../tools/generate-context/index.js";

export const contextCommand = new Command("context");

contextCommand
  .requiredOption("-e, --entrypoint <paths...>", "Entrypoint files to analyze")
  .action(generateContext);
