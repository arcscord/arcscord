#!/usr/bin/env node

import * as console from "node:console";
import { createRequire } from "node:module";
import * as process from "node:process";
import { Command } from "@commander-js/extra-typings";
import { InitCommand } from "./commands/init.js";
import { NewCommand } from "./commands/new.js";

const cli = new Command();

cli
  .name("Arcscord")
  .description("Cli for arcscord framework")
  .version((createRequire(import.meta.url)("../package.json") as { version: string }).version);

cli.command("ping")
  .action(async () => {
    console.log("Pong !");
  });
cli.addCommand(InitCommand);
cli.addCommand(NewCommand);
cli.parse(process.argv);
