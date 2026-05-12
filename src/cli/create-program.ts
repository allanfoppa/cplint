import { Command } from "commander";

import { contextCommand } from "./commands/context.command.js";

export function createProgram() {
  const program = new Command();

  program
    .name("cplint")
    .description(
      "Consumer Oriented Programming tooling for AI-aware development",
    );

  program.helpCommand(true);
  program.addCommand(contextCommand);

  return program;
}
