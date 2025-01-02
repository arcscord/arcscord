import { confirm, select } from "@inquirer/prompts";

export async function eslintPrompt(eslint?: "eslint" | "antfu" | "arcscord"): Promise<"eslint" | "antfu" | "arcscord" | false> {
  if (!eslint) {
    if (!await confirm({ message: "Do you want to use eslint?" })) {
      return false;
    }
  }
  return await select({
    message: "Which eslint config do you want to use?",
    choices: ["eslint", "antfu", "arcscord"],
  });
}
