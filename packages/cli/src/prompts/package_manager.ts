import type { PackageManagerType } from "../arcscord_file/type.js";
import { select } from "@inquirer/prompts";

export async function packageManagerPrompt(packageManager?: PackageManagerType): Promise<PackageManagerType> {
  if (packageManager) {
    return packageManager;
  }

  return await select({
    message: "What package manager do you want to use?",
    choices: ["npm", "pnpm", "yarn"],
  });
}
