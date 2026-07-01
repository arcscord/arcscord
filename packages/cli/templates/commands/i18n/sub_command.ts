import { createSubCommand } from "arcscord";

export const {{name}}Command = createSubCommand({
  name: "{{name}}",
  nameLocalizations: t => t("{{i18nName}}"),
  description: "A sub command",
  descriptionLocalizations: t => t("{{i18nDescription}}"),
  run: (ctx) => {
    return ctx.reply(ctx.t("default.run"));
  }
});