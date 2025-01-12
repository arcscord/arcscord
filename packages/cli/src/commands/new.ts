import type { ArcscordFileData } from "../arcscord_file/type.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as commander from "@commander-js/extra-typings";
import { Command, Option } from "@commander-js/extra-typings";
import { parseArcscordFile } from "../arcscord_file/func.js";
import { addHandlerToList } from "../generators/handler_list.js";
import { addToSubDefinition } from "../generators/sub_def_command.js";
import { initializeCommandFile, initializeSubCommandDefFile, initializeSubCommandFile } from "../generators/templates.js";
import { commandTypePrompt } from "../prompts/command_type.js";
import { handlerNamePrompt } from "../prompts/handler_name.js";
import { noIncompatibleOptions } from "../utils/cli_options.js";
import { eslintFixMultiples } from "../utils/eslint.js";
import { checkIfFileExist, cleanPath, readOrCreate } from "../utils/file.js";
import { getSubCommandGroupDescriptionI18nPath, getSubCommandGroupNameI18nPath } from "../utils/i18n.js";
import { prettierFixMultiples } from "../utils/prettier.js";
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
    const [err, projectOptions] = await parseArcscordFile();
    if (err) {
      throw err;
    }
    const name = await handlerNamePrompt(type.slice(0, -1), options.name);
    const names = name.split("/");
    const handlerName = names[names.length - 1];
    const subFolders = names.length > 1 ? names.slice(0, -1).join("/") : "";
    // the file path and if is created
    const fileToCheck: [string, boolean][] = [];
    const i18n = projectOptions.options.includes("i18n") && options.i18n;

    switch (type) {
      case "commands": {
        fileToCheck.push(...(await handleNewCommand(projectOptions, { ...options, name: handlerName.toLowerCase(), subFolders, i18n })));
        break;
      }

      case "events": {
        fileToCheck.push(...(await handleNewEvent(projectOptions, { ...options, name: handlerName, subFolders })));
        break;
      }
      default: {
        console.error("not implemented yet");
        process.exit(1);
      }
    }

    // fix prettier and eslint
    if (options.eslint && projectOptions.options.includes("eslint")) {
      if (options.prettier && projectOptions.options.includes("prettier")) {
        prettierFixMultiples(fileToCheck.map(f => f[0]));
      }
      eslintFixMultiples(fileToCheck.map(f => f[0]));
    }
    logUpdates(fileToCheck);
  });

type NewCommandOptions = {
  i18n: boolean;
  slash?: true | undefined;
  message?: true | undefined;
  user?: true | undefined;
  name: string;
  subFolders: string;
};

async function handleNewCommand(projectOptions: ArcscordFileData, commandsOptions: NewCommandOptions): Promise<[string, boolean][]> {
  const commandType = await commandTypePrompt(noIncompatibleOptions(commandsOptions, ["slash", "message", "user"]));

  if (!commandsOptions.name.includes(".")) {
    const basePath = path.resolve(projectOptions.basePaths.root, projectOptions.basePaths.commands, commandsOptions.subFolders);
    const fileContent = await handleNewSimpleCommand(projectOptions, commandsOptions, commandType);
    const fileRoot = path.resolve(basePath, `${camelOrPascalToSnakeCase(commandsOptions.name)}_command.ts`);
    checkIfFileExist(fileRoot);

    await mkdir(basePath, { recursive: true });
    await writeFile(fileRoot, fileContent, "utf8");

    const importPath = `${projectOptions.basePaths.commands
      + (commandsOptions.subFolders
        ? `/${commandsOptions.subFolders}`
        : "")
    }/${camelOrPascalToSnakeCase(commandsOptions.name)}_command`;

    await updateHandlersList(projectOptions, `${commandsOptions.name}Command`, importPath, "commands");
    return [[fileRoot, true], [projectOptions.basePaths.handlerList, false]];
  }

  if (commandType !== "slash") {
    console.error("sub command can only be created for slash command");
    process.exit(1);
  }

  const name = getSubNames(commandsOptions.name);
  const basePath = path.resolve(projectOptions.basePaths.root, projectOptions.basePaths.commands, commandsOptions.subFolders, name[0]);
  const subCommandPath = await createSubCommand(projectOptions, commandsOptions, basePath, name);
  const definitionResult = await updateSubCommandDef(projectOptions, commandsOptions, basePath, name);
  if (definitionResult[1]) {
    await updateHandlersList(projectOptions, `${name[0]}CommandDef`, `${projectOptions.basePaths.commands
    + (commandsOptions.subFolders
      ? `/${commandsOptions.subFolders}`
      : "")
    }/${name[0]}/def`, "commands");
    return [[subCommandPath, true], definitionResult, [projectOptions.basePaths.handlerList, false]];
  }
  return [[subCommandPath, true], definitionResult];
}

type SubNames = [baseName: string, subGroupName: undefined | string, subName: string];

function getSubNames(name: string): SubNames {
  const subNames = name.split(".");
  if (subNames.length < 2 || subNames.length > 3) {
    console.error("Invalid sub command name, allowed format is name.subName.subGroupName or name.subName");
    process.exit(1);
  }
  const baseName = subNames[0];
  const subGroupName = subNames.length === 3 ? subNames[1] : undefined;
  const subName = subNames[subNames.length - 1];

  return [baseName, subGroupName, subName];
}

async function handleNewSimpleCommand(projectOptions: ArcscordFileData, commandsOptions: NewCommandOptions, commandType: "slash" | "message" | "user"): Promise<string> {
  const templatePath = new URL(`../../templates/commands/${
    commandsOptions.i18n ? "i18n/" : "basic/"
  }${camelOrPascalToSnakeCase(commandType)}_command.ts`, import.meta.url).pathname;

  const fileContent = await readFile(templatePath, "utf8");

  return initializeCommandFile(fileContent, commandsOptions.name, commandsOptions.subFolders, projectOptions);
}

async function createSubCommand(projectOptions: ArcscordFileData, commandsOptions: NewCommandOptions, basePath: string, name: SubNames): Promise<string> {
  const subCommandTemplatePath = new URL(`../../templates/commands/${
    commandsOptions.i18n ? "i18n/" : "basic/"
  }/sub_command.ts`, import.meta.url);

  const subCommandPath = path.resolve(basePath, name[1] ?? "", `${name[2]}.ts`);
  checkIfFileExist(subCommandPath);

  await mkdir(path.resolve(basePath, name[1] ?? ""), { recursive: true });

  const subCommandTemplate = await readFile(subCommandTemplatePath, "utf8");
  const subCommandContent = initializeSubCommandFile(subCommandTemplate, {
    name: name[0],
    path: commandsOptions.subFolders,
    groupName: name[1],
    subName: name[2],
  }, projectOptions);

  await writeFile(subCommandPath, subCommandContent, "utf8");

  return subCommandPath;
}

async function updateSubCommandDef(projectOptions: ArcscordFileData, commandsOptions: NewCommandOptions, basePath: string, name: SubNames): Promise<[string, boolean]> {
  const definitionFileTemplate = await readFile(new URL(`../../templates/commands/${
    commandsOptions.i18n ? "i18n/" : "basic/"
  }/sub_def_command.ts`, import.meta.url), "utf8");

  const defaultDefinitionContent = initializeSubCommandDefFile(definitionFileTemplate, name[0], commandsOptions.subFolders, projectOptions);
  const definitionPath = path.resolve(basePath, "def.ts");

  const [definitionFileContent, created] = await readOrCreate(
    definitionPath,
    defaultDefinitionContent,
  );

  const newDefinitionFileContent = addToSubDefinition({
    name: `${name[2]}Command`,
    path: name[1] ? `./${name[1]}/${name[2]}` : `./${name[2]}`,
    fileContent: definitionFileContent,
    impGroupName: name[1],
    importExtension: projectOptions.customExtension ?? "",
    i18n: commandsOptions.i18n,
    nameLocalizationName: getSubCommandGroupNameI18nPath(projectOptions, {
      name: name[0],
      path: commandsOptions.subFolders,
      groupName: name[1] || "error",
    }),
    descriptionLocalizationName: getSubCommandGroupDescriptionI18nPath(projectOptions, {
      name: name[0],
      path: commandsOptions.subFolders,
      groupName: name[1] || "error",
    }),
  });

  await writeFile(definitionPath, newDefinitionFileContent, "utf8");
  return [definitionPath, created];
}

type NewEventOptions = {
  name: string;
  subFolders: string;
};
async function handleNewEvent(projectOptions: ArcscordFileData, eventsOptions: NewEventOptions): Promise<[string, boolean][]> {
  const templatePath = new URL(`../../templates/event/event.ts`, import.meta.url).pathname;

  const fileContent = (await readFile(templatePath, "utf8")).replaceAll("{{name}}", eventsOptions.name);

  const fileRoot = path.resolve(projectOptions.basePaths.root, projectOptions.basePaths.events, eventsOptions.subFolders, `${camelOrPascalToSnakeCase(eventsOptions.name)}.ts`);

  checkIfFileExist(fileRoot);

  await mkdir(path.resolve(projectOptions.basePaths.root, projectOptions.basePaths.events, eventsOptions.subFolders), { recursive: true });

  await writeFile(fileRoot, fileContent, "utf8");

  const importPath = `${projectOptions.basePaths.events
    + (eventsOptions.subFolders
      ? `/${eventsOptions.subFolders}`
      : "")
  }/${camelOrPascalToSnakeCase(eventsOptions.name)}`;

  await updateHandlersList(projectOptions, `${eventsOptions.name}Event`, importPath, "events");
  return [[fileRoot, true], [projectOptions.basePaths.handlerList, false]];
}

async function updateHandlersList(projectOptions: ArcscordFileData, handlerName: string, handlerPath: string, handlerType: "commands" | "events" | "components" | "tasks"): Promise<void> {
  const handlersListFile = await readFile(projectOptions.basePaths.handlerList, "utf8");
  const newContent = addHandlerToList({
    name: handlerName,
    path: handlerPath,
    type: handlerType,
    fileContent: handlersListFile,
    importExtension: projectOptions.customExtension ?? "",
  });
  await writeFile(projectOptions.basePaths.handlerList, newContent, "utf8");
}

function logUpdates(updates: [string, boolean][]): void {
  for (const [file, isNew] of updates.sort((a, b) => Number(b[1]) - Number(a[1]))) {
    console.log(`${isNew ? "CREATED" : "UPDATED"} ${cleanPath(file)}`);
  }
}
