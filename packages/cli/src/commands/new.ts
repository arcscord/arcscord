import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as commander from "@commander-js/extra-typings";
import { Command, Option } from "@commander-js/extra-typings";
import { parseArcscordFile } from "../arcscord_file/func.js";
import { addHandlerToList } from "../generators/handler_list.js";
import { addToSubDefinition } from "../generators/sub_def_command.js";
import { initializeSubCommandDefFile, initializeSubCommandFile } from "../generators/templates.js";
import { commandTypePrompt } from "../prompts/command_type.js";
import { handlerNamePrompt } from "../prompts/handler_name.js";
import { noIncompatibleOptions } from "../utils/cli_options.js";
import { eslintFix } from "../utils/eslint.js";
import { cleanPath, readOrCreate } from "../utils/file.js";
import { getCommandDescriptionI18nPath, getCommandNameI18nPath, getSubCommandGroupDescriptionI18nPath, getSubCommandGroupNameI18nPath } from "../utils/i18n.js";
import { prettierFix } from "../utils/prettier.js";
import { camelOrPascalToSnakeCase } from "../utils/string.js";

export const NewCommand = new Command("new")
  .description("create a new handler")
  .addArgument(new commander.Argument("<type>")
    .choices(["command", "cmd", "c", "component", "comp", "cp", "event", "e", "task", "t"] as const)
    .argParser((type): "commands" | "events" | "components" | "tasks" => {
      if (!["command", "cmd", "c", "component", "comp", "cp", "event", "e", "task", "t"].includes(type)) {
        throw new Error("Invalid type");
      }
      switch (type) {
        case "command":
        case "cmd":
        case "c":
          return "commands";
        case "component":
        case "comp":
        case "cp":
          return "components";
        case "event":
        case "e":
          return "events";
        case "task":
        case "t":
          return "tasks";
      }
      throw new Error("Invalid type");
    }))
  .addOption(new Option("--name <name>", "name of the handler (accept / for sub folder)"))
  .addOption(new Option("--no-eslint", "do not use eslint"))
  .addOption(new Option("--no-prettier", "do not use prettier"))
  .addOption(new Option("--no-i18n", "do not use i18n (default if project don't have i18n)"))

  .addOption(new Option("-s --slash", "create a slash command"))
  .addOption(new Option("-m --message", "create a message command"))
  .addOption(new Option("-u --user", "create a user command"))
  .action(async (type, options) => {
    if (type !== "commands") {
      console.error("not implemented yet");
      process.exit(1);
    }

    const [err, projectOptions] = await parseArcscordFile();
    if (err) {
      throw err;
    }
    const name = await handlerNamePrompt(type.slice(0, -1), options.name);
    const names = name.split("/");
    const handlerName = names[names.length - 1];
    const subFolders = names.length > 1 ? names.slice(0, -1).join("/") : "";

    let fileContent = "";
    // the file path and if is created
    const fileToCheck: [string, boolean][] = [];
    const i18n = projectOptions.options.includes("i18n") && options.i18n;
    let basePath = path.resolve(projectOptions.basePaths.root, projectOptions.basePaths[type], subFolders);

    let updateHandlerList = true;
    let fullHandlerName = "";
    let fullHandlerPath = "";
    let skipFileCreation = false;

    switch (type) {
      case "commands": {
        const commandType = await commandTypePrompt(
          noIncompatibleOptions(options, ["slash", "message", "user"]),
        );

        if (!handlerName.includes(".")) {
          const templatePath = new URL(`../../templates/commands/${
            i18n ? "i18n/" : "basic/"
          }${camelOrPascalToSnakeCase(commandType)}_command.ts`, import.meta.url).pathname;

          fileContent = await readFile(templatePath, "utf8");
          fileContent = fileContent.replaceAll("{{name}}", handlerName);

          fileContent = fileContent.replaceAll("{{i18nName}}", getCommandNameI18nPath(projectOptions, {
            name: handlerName,
            path: subFolders,
          }));
          fileContent = fileContent.replaceAll("{{i18nDescription}}", getCommandDescriptionI18nPath(projectOptions, {
            name: handlerName,
            path: subFolders,
          }));

          fullHandlerName = handlerName + type[0].toUpperCase() + type.slice(1, -1);
          fullHandlerPath = `${projectOptions.basePaths[type]}/${handlerName}_${type.slice(0, -1)}`;
        }
        else {
          if (commandType !== "slash") {
            throw new Error("Sub command can only be created for slash command");
          }
          const subNames = handlerName.split(".");
          if (subNames.length < 2 || subNames.length > 3) {
            throw new Error("Invalid sub command name, allowed format is name.subName.subGroupName or name.subName");
          }
          const baseName = subNames[0];
          const subGroupName = subNames.length === 3 ? subNames[1] : undefined;
          const subName = subNames[subNames.length - 1];

          basePath = path.resolve(projectOptions.basePaths.root, projectOptions.basePaths[type], subFolders, baseName);
          await mkdir(path.resolve(basePath, subGroupName ?? ""), { recursive: true });

          const subCommandTemplatePath = new URL(`../../templates/commands/${
            i18n ? "i18n/" : "basic/"
          }/sub_command.ts`, import.meta.url);

          const subCommandTemplate = await readFile(subCommandTemplatePath, "utf8");
          const subCommandContent = initializeSubCommandFile(subCommandTemplate, {
            name: baseName,
            path: subFolders,
            groupName: subGroupName,
            subName,
          }, projectOptions);

          const subCommandPath = path.resolve(basePath, subGroupName ?? "", `${subName}.ts`);

          if (existsSync(subCommandPath)) {
            console.log(`${cleanPath(subCommandPath)} already exists`);
            process.exit(1);
          }

          await writeFile(subCommandPath, subCommandContent, "utf8");
          fileToCheck.push([subCommandPath, true]);

          const definitionFileTemplate = await readFile(new URL(`../../templates/commands/${
            i18n ? "i18n/" : "basic/"
          }/sub_def_command.ts`, import.meta.url), "utf8");

          const defaultDefinitionContent = initializeSubCommandDefFile(definitionFileTemplate, baseName, names.slice(0, -1).join("/"), projectOptions);
          const definitionPath = path.resolve(basePath, "def.ts");

          let definitionFileContent = "";
          [definitionFileContent, updateHandlerList] = await readOrCreate(
            definitionPath,
            defaultDefinitionContent,
          );

          const newDefinitionFileContent = addToSubDefinition({
            name: `${subName}Command`,
            path: subGroupName ? `./${subGroupName}/${subName}` : `./${subName}`,
            fileContent: definitionFileContent,
            impGroupName: subGroupName,
            importExtension: "",
            i18n,
            nameLocalizationName: getSubCommandGroupNameI18nPath(projectOptions, {
              name: baseName,
              path: subFolders,
              groupName: subGroupName || "error",
            }),
            descriptionLocalizationName: getSubCommandGroupDescriptionI18nPath(projectOptions, {
              name: baseName,
              path: subFolders,
              groupName: subGroupName || "error",
            }),
          });

          await writeFile(definitionPath, newDefinitionFileContent, "utf8");
          if (updateHandlerList) {
            fileToCheck.push([definitionPath, true]);
          }
          else {
            fileToCheck.push([definitionPath, false]);
          }

          skipFileCreation = true;
          fullHandlerName = `${baseName}CommandDef`;
          fullHandlerPath = `${projectOptions.basePaths[type]}/${baseName}/def`;
        }
        break;
      }
      default: {
        throw new Error("not implemented yet");
      }
    }

    if (updateHandlerList) {
      if (!skipFileCreation) {
        await mkdir(basePath, { recursive: true });
        const fileRoot = path.resolve(basePath, `${camelOrPascalToSnakeCase(handlerName)}_${type.slice(0, -1)}.ts`);
        await writeFile(fileRoot, fileContent, "utf8");
        fileToCheck.push([fileRoot, true]);
      }
      const handlersListFile = await readFile(projectOptions.basePaths.handlerList, "utf8");
      const newContent = addHandlerToList({
        name: fullHandlerName,
        path: fullHandlerPath,
        type,
        fileContent: handlersListFile,
        importExtension: "",
      });
      await writeFile(projectOptions.basePaths.handlerList, newContent, "utf8");
      fileToCheck.push([projectOptions.basePaths.handlerList, false]);
    }

    for (const [file, isNew] of fileToCheck.sort((a, b) => Number(b[1]) - Number(a[1]))) {
      if (options.eslint && projectOptions.options.includes("eslint")) {
        if (options.prettier && projectOptions.options.includes("prettier")) {
          prettierFix(file);
          eslintFix(file);
        }
        else {
          eslintFix(file);
        }
      }
      console.log(`${isNew ? "CREATED" : "UPDATED"} ${cleanPath(file)}`);
    }
  });
