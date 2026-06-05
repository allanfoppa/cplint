import { Command } from "commander";
import { contextCompiler } from "../../tools/context-compiler/index.js";

export const compileCommand = new Command("compile-context");

compileCommand
  .argument("<file>", "The *.context.ai.yaml file to compile")
  .option(
    "--interleave",
    "Optimize position encoding weights by interleaving manual and auto scopes",
    false,
  )
  .action(async (file, options) => {
    try {
      const output = await contextCompiler(file, options);
      console.log(output);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Compilation failed: ${message}`);
      process.exit(1);
    }
  });
