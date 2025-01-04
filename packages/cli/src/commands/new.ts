import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import * as commander from "@commander-js/extra-typings";
import { Command, Option } from "@commander-js/extra-typings";
import { parseArcscordFile } from "../arcscord_file/func.js";
import { addHandlerToList } from "../generators/handler_list.js";
import { commandTypePrompt } from "../prompts/command_type.js";
import { handlerNamePrompt } from "../prompts/handler_name.js";
import { noIncompatibleOptions } from "../utils/cli_options.js";
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
  .addOption(new Option("--sub-def", "create a sub command definition"))
  .addOption(new Option("--sub [name]", "create a sub command (name = base sub command name, use a . for sub command group, like group.sub)"))
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

    let fileContent = "";
    switch (type) {
      case "commands": {
        const commandType = await commandTypePrompt(
          noIncompatibleOptions(options, ["slash", "message", "user", "sub", "subDef"]),
        );

        const templatePath = new URL(`../../templates/commands/${
          projectOptions.options.includes("i18n") ? "i18n/" : "basic/"
        }${camelOrPascalToSnakeCase(commandType)}_command.ts`, import.meta.url).pathname;

        fileContent = await readFile(templatePath, "utf8");

        break;
      }
      default: {
        throw new Error("not implemented yet");
      }
    }

    fileContent = fileContent.replaceAll("{{name}}", names[names.length - 1]);

    let root = projectOptions.basePaths[type];

    if (names.length > 1) {
      root = `${root}/${names.slice(0, -1).join("/")}`;
    }
    await mkdir(root, { recursive: true });

    await writeFile(`${root}/${camelOrPascalToSnakeCase(names[names.length - 1])}_${type.slice(0, -1)}.ts`, fileContent, "utf8");

    const handlersListFile = await readFile(projectOptions.basePaths.handlerList, "utf8");
    const newContent = addHandlerToList({
      name: names[names.length - 1],
      path: `./${names[names.length - 1]}_${type.slice(0, -1)}`,
      type,
      fileContent: handlersListFile,
      importExtension: "",
    });
    await writeFile(projectOptions.basePaths.handlerList, newContent, "utf8");
    console.log(`${type.slice(0, -1)} created in ${root}/${camelOrPascalToSnakeCase(names[names.length - 1])}_${type.slice(0, -1)}.ts`);
  });
