import { confirm } from "@inquirer/prompts";

export async function prettierPrompt(): Promise<boolean> {
  return await confirm({ message: "Do you want to use prettier?" });
}
