import { checkbox } from "@inquirer/prompts";

export async function additionalPrompt({
  i18n,
}: {
  i18n?: boolean;
}): Promise<{
    i18n: boolean;
  }> {
  if (i18n) {
    return { i18n: true };
  }

  const result = await checkbox({
    message: "With which additional features do you want to use?",
    choices: [
      { name: "i18n", value: "i18n" },
    ],
  });
  return { i18n: result.includes("i18n") };
}
