import { createCommand } from "arcscord";

export const {{name}}Command = createCommand({
  build: {
    slash: {
      name: "{{name}}",
      nameLocalizations: t => t("{{i18nName}}"),
      description: "A slash command",
      descriptionLocalizations: t => t("{{i18nDescription}}"),
    },
  },
  run: (ctx) => {
    return ctx.reply(ctx.t("default.run"));
  },
});
