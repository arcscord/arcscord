import type { SlashWithSubsCommandDefinition } from "arcscord";

export const {{name}}CommandDef = {
  name: "{{name}}",
  nameLocalizations: t => t("{{i18nName}}"),
  description: "Command description",
  descriptionLocalizations: t => t("{{i18nDescription}}"),
} satisfies SlashWithSubsCommandDefinition;
