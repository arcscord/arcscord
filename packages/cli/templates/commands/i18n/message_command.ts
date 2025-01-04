import { createCommand } from "arcscord";

export const {{name}}Command = createCommand({
  build: {
    message: {
      name: "{{name}}",
      nameLocalizations: t => t("commands.{{name}}.name"),
    },
  },
  run: (ctx) => {
    return ctx.reply(ctx.t("commands.{{name}}.run"));
  },
});