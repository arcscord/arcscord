import type { Options as ArcscordFileOptions } from "../arcscord_file/type.js";
import { execSync } from "node:child_process";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process, { exit } from "node:process";
import { Command, Option } from "@commander-js/extra-typings";
import { generateArcscordFile } from "../arcscord_file/generator.js";
import { generateEnvFile } from "../generators/env.js";
import { generatePackageJson } from "../generators/package.js";
import { additionalPrompt } from "../prompts/additional.js";
import { eslintPrompt } from "../prompts/eslint.js";
import { packageManagerPrompt } from "../prompts/package_manager.js";
import { prettierPrompt } from "../prompts/prettier.js";
import { projectNamePrompt } from "../prompts/project_name.js";
import { copy } from "../utils/copy.js";
import { eslintFix } from "../utils/eslint.js";
import { prettierFix } from "../utils/prettier.js";

export const InitCommand = new Command("init")
  .description("initialize a new project")
  .addOption(
    new Option("--name <name>", "name of the project"),
  )
  .addOption(
    new Option("--package-manager <packageManager>", "package manager to use").choices(["npm", "pnpm", "yarn"] as const),
  )
  .addOption(new Option("--prettier", "use prettier"))
  .addOption(new Option("--eslint [config]", "use eslint").choices(["eslint", "antfu", "arcscord"] as const))
  .addOption(new Option("--i18n", "use i18n"))
  .addOption(new Option("--no-install", "do not install dependencies"))
  .action(async (options) => {
    const name = await projectNamePrompt(options.name);
    const packageManager = await packageManagerPrompt(options.packageManager);
    const eslint = await eslintPrompt(options.eslint);
    const prettier = options.prettier ?? (eslint === "eslint" ? await prettierPrompt() : false);
    const additional = await additionalPrompt({ i18n: options.i18n });

    const arcscordFileOptions: ArcscordFileOptions[] = [];
    if (eslint) {
      arcscordFileOptions.push("eslint");
    }
    if (prettier) {
      arcscordFileOptions.push("prettier");
    }

    if (eslint !== "eslint" && prettier) {
      console.error("prettier is only compatible with eslint recommended config, not with arcscord or antfu config");
      exit(1);
    }

    const root = path.resolve(name);
    const dirName = path.basename(root);

    const dirStats = await stat(root).catch(async (err) => {
      if (err.code === "ENOENT") {
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

    console.log(`Initializing project in "${dirName}"...`);

    await copy("init/global", root);
    if (additional.i18n) {
      arcscordFileOptions.push("i18n");
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
    await writeFile(`${root}/arcscord.json`, generateArcscordFile({
      version: 1,
      packageManager: {
        type: packageManager,
      },
      options: arcscordFileOptions,
    }), "utf8");

    if (eslint) {
      if (prettier) {
        await copy("eslint/prettier.config.mjs", `${root}/eslint.config.mjs`);
      }
      else {
        await copy(`eslint/${eslint}.config.mjs`, `${root}/eslint.config.mjs`);
      }
    }

    console.log(`Project initialized in "${dirName}"`);
    process.chdir(root);
    if (options.install) {
      console.log("Installing dependencies...");
      await execSync(`${packageManager} install`, { cwd: root });
      console.log("Dependencies installed");

      if (eslint) {
        if (prettier) {
          prettierFix(root);
          eslintFix(root);
          console.log("Eslint and prettier fixed");
        }
        else {
          eslintFix(root);
          console.log("Eslint fixed");
        }
      }
    }
    else {
      console.log("Dependencies installation skipped");
    }
  });
