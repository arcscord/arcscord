#!/usr/bin/env node

import { execSync } from "node:child_process";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process, { exit } from "node:process";
import { Argument, Command, Option } from "@commander-js/extra-typings";
import { generateEnvFile } from "./generators/env.js";
import { generatePackageJson } from "./generators/package.js";
import { additionalPrompt } from "./prompts/additional.js";
import { eslintPrompt } from "./prompts/eslint.js";
import { packageManagerPrompt } from "./prompts/package_manager.js";
import { prettierPrompt } from "./prompts/prettier.js";
import { projectNamePrompt } from "./prompts/project_name.js";
import { eslintFix } from "./utils/eslint.js";
import { copy } from "./utils/file.js";
import { prettierFix } from "./utils/prettier.js";

const program = new Command()
  .name("create-arcscord-bot")
  .description("Scaffold a new Arcscord bot")
  .addArgument(new Argument("[name]", "project name / target directory"))
  .addOption(new Option("--package-manager <packageManager>", "package manager to use").choices(["npm", "pnpm", "yarn"] as const))
  .addOption(new Option("--prettier", "use prettier"))
  .addOption(new Option("--eslint [config]", "use eslint").choices(["eslint", "antfu", "arcscord"] as const))
  .addOption(new Option("--i18n", "use i18n"))
  .addOption(new Option("--no-install", "do not install dependencies"))
  .action(async (nameArg, options) => {
    const name = await projectNamePrompt(nameArg);
    const packageManager = await packageManagerPrompt(options.packageManager);
    const eslint = await eslintPrompt(options.eslint);
    const prettier = options.prettier ?? (eslint === "eslint" ? await prettierPrompt() : false);
    const additional = await additionalPrompt({ i18n: options.i18n });

    if (eslint !== "eslint" && prettier) {
      console.error("prettier is only compatible with eslint recommended config, not with arcscord or antfu config");
      exit(1);
    }

    const root = path.resolve(name);
    const dirName = path.basename(root);

    const dirStats = await stat(root).catch(async (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        await mkdir(root, { recursive: true });
        return stat(root);
      }
      throw err;
    });

    if (!dirStats.isDirectory()) {
      throw new Error(`"${dirName}" is not a directory`);
    }
    if ((await readdir(root)).length > 0) {
      throw new Error(`"${dirName}" is not empty`);
    }

    console.log(`Creating project in "${dirName}"...`);

    await copy("init/global", root);
    if (additional.i18n) {
      await copy("init/i18n", root);
    }
    else {
      await copy("init/basic", root);
    }

    await writeFile(`${root}/package.json`, generatePackageJson({
      name,
      eslint,
      prettier,
      i18n: additional.i18n,
    }), "utf8");
    await writeFile(`${root}/.env`, generateEnvFile(), "utf8");

    if (eslint) {
      if (prettier) {
        await copy("eslint/prettier.config.mjs", `${root}/eslint.config.mjs`);
      }
      else {
        await copy(`eslint/${eslint}.config.mjs`, `${root}/eslint.config.mjs`);
      }
    }

    console.log(`Project created in "${dirName}"`);
    process.chdir(root);
    if (options.install) {
      console.log("Installing dependencies...");
      execSync(`${packageManager} install`, { cwd: root, stdio: "inherit" });
      console.log("Dependencies installed");
      if (eslint) {
        if (prettier) {
          prettierFix(root);
        }
        eslintFix(root);
      }
    }
    else {
      console.log("Dependencies installation skipped");
    }

    console.log(`\nNext steps:\n  cd ${dirName}\n  add your bot token to .env\n  ${packageManager} run dev`);
  });

program.parse(process.argv);
