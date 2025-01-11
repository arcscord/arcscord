import { createCommand } from "arcscord";

export const {{name}}Command = createCommand({
  build: {
    message: {
      name: "{{name}}",
      nameLocalizations: t => t("{{i18nName}}"),
    },
  },
  run: (ctx) => {
    return ctx.reply(ctx.t("default.run"));
  },
});