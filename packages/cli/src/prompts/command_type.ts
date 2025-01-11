import { select } from "@inquirer/prompts";

export async function commandTypePrompt(type?: "slash" | "message" | "user"): Promise<"slash" | "message" | "user"> {
  if (type) {
    return type;
  }

  return await select({
    message: "What type of command do you want to create?",
    choices: ["slash", "message", "user"],
  });
}
