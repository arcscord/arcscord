import type { SlashWithSubsCommandDefinition } from "arcscord";

export const {{name}}CommandDef = {
  name: "{{name}}",
  nameLocalizations: t => t("commands.{{name}}.name"),
  description: "Command description",
  descriptionLocalizations: t => t("commands.{{name}}.description"),
} satisfies SlashWithSubsCommandDefinition;
