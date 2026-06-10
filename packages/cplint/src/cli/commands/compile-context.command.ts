import { Command } from "commander";
import { contextCompiler } from "../../tools/context-compiler/index.js";

export const compileCommand = new Command("compile");

compileCommand
  .description("Compile a .cplint.yaml into an interleaved, LLM-ready payload")
  .requiredOption("-f, --file <path>", "Path to the .cplint.yaml file")
  .option(
    "-i, --interleave",
    "Interleave manual and auto blocks by symbol scope",
    true,
  )
  .option(
    "-o, --output <path>",
    "Save compiled output to a file instead of stdout",
  )
  .action(async (options) => {
    const result = await contextCompiler(options.file, {
      interleave: options.interleave,
      output: options.output,
    });

    if (!options.output) {
      process.stdout.write(result);
    }
  });
