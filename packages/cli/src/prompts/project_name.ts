import { exit } from "node:process";
import { input } from "@inquirer/prompts";
import { PACKAGE_NAME_REGEX } from "../utils/const";

export async function projectNamePrompt(name?: string): Promise<string> {
  if (name) {
    if (!PACKAGE_NAME_REGEX.test(name)) {
      console.error("Invalid package name");
      console.log("See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name");
      exit(1);
    }
    return name;
  }

  while (true) {
    const name = await input({
      message: "What is the name of your project?",
    });
    if (!PACKAGE_NAME_REGEX.test(name)) {
      console.error("Invalid package name");
      console.log("See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#name");
      continue;
    }
    return name;
  }
}
