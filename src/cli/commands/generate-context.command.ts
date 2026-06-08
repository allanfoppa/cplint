import { Command } from "commander";
import { contextGenerator } from "../../tools/context-generator/index.js";

export const contextCommand = new Command("generate");

contextCommand
  .description(
    "Generate .cplint.yaml context files from TypeScript source files",
  )
  .option("-e, --entrypoint <paths...>", "One or more source files to analyze")
  .option(
    "-a, --all",
    "Scan entire rootPath and generate context for all TypeScript files",
  )
  .action((options) => {
    if (!options.entrypoint && !options.all) {
      console.error(
        "❌ Provide --entrypoint <file> or --all to scan rootPath.",
      );
      process.exit(1);
    }
    contextGenerator(options);
  });
