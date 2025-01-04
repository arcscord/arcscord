import { select } from "@inquirer/prompts";

export async function commandTypePrompt(type?: "slash" | "message" | "user" | "sub" | "subDef"): Promise<"slash" | "message" | "user" | "sub" | "subDef"> {
  if (type) {
    return type;
  }

  return await select({
    message: "What type of command do you want to create?",
    choices: ["slash", "message", "user", "sub", "subDef"],
  });
}
