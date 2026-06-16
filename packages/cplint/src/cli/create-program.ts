import { Command } from "commander";

import { tokenCounterCommand } from "./commands/token-counter.js";
import { generateCommand } from "./commands/generate.command.js";
import { lintCommand } from "./commands/lint.command.js";

export function createProgram() {
  const program = new Command();

  program
    .name("cplint")
    .description(
      "Consumer Oriented Programming tooling for AI-aware development",
    );

  program.helpCommand(true);

  program.addCommand(tokenCounterCommand);
  program.addCommand(generateCommand);
  program.addCommand(lintCommand);

  return program;
}
