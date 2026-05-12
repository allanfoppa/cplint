#!/usr/bin/env node

import { Command } from "commander";

import { generateCommand } from "./generate-context/cli.js";

const program = new Command();

program
  .name("cplint")
  .description("Consumer Oriented Programming Context Tooling");

program.addCommand(generateCommand);

program.parse();
