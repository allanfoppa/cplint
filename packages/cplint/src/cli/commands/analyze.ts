import { Command } from "commander";
import { runAnalyzer } from "../../tools/analyze/index.js";

export const analyzeCommand = new Command("analyze")
  .description(
    "Analyze the token footprint of source files, helping you identify potential files to optimize for context before send to LLMs.",
  )
  .option("-w, --warn <n>", "threshold de warning", "2000")
  .action(async (options) => runAnalyzer(options));
