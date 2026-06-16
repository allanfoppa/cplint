import { Command } from "commander";
import { runTokenCounter } from "../../tools/token-counter/index.js";

export const tokenCounterCommand = new Command("token-counter")
  .description(
    "Analyze the token footprint of source files, helping you identify potential files to optimize for context before send to LLMs.",
  )
  .option("-w, --warn <n>", "threshold de warning", "2000")
  .action(async (options) => runTokenCounter(options));
