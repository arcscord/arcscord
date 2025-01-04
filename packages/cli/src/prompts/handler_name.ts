import { input } from "@inquirer/prompts";

export async function handlerNamePrompt(type: string, name?: string): Promise<string> {
  if (name) {
    return name;
  }

  return await input({
    message: `What is the name of your ${type} ? (accept / for sub folder)`,
  });
}
