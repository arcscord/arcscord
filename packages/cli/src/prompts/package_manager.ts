import { select } from "@inquirer/prompts";

export async function packageManagerPrompt(packageManager?: "npm" | "pnpm" | "yarn"): Promise<"npm" | "pnpm" | "yarn"> {
  if (packageManager) {
    return packageManager;
  }

  return await select({
    message: "What package manager do you want to use?",
    choices: ["npm", "pnpm", "yarn"],
  });
}
