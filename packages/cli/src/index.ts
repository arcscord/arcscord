#!/usr/bin/env node

import * as console from "node:console";
import * as process from "node:process";
import { Command } from "@commander-js/extra-typings";
import packageJson from "../package.json" with { type: "json" };
import { InitCommand } from "./commands/init.js";

const cli = new Command();

cli
  .name("Arcscord")
  .description("Cli for arcscord framework")
  .version(packageJson.version);

cli.command("ping")
  .action(async () => {
    console.log("Pong !");
  });
cli.addCommand(InitCommand);
cli.parse(process.argv);
