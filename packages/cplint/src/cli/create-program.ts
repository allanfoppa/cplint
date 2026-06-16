import { Command } from "commander";

import { contextCommand } from "./commands/generate-context.command.js";
import { compileCommand } from "./commands/compile-context.command.js";
import { lintCommand } from "./commands/lint.command.js";
import { tokenCounterCommand } from "./commands/token-counter.js";

export function createProgram() {
  const program = new Command();

  program
    .name("cplint")
    .description(
      "Consumer Oriented Programming tooling for AI-aware development",
    );

  program.helpCommand(true);

  program.addCommand(contextCommand);
  program.addCommand(compileCommand);
  program.addCommand(lintCommand);
  program.addCommand(tokenCounterCommand);

  return program;
}
