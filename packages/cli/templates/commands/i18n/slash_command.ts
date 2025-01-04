import { createCommand } from "arcscord";

export const {{name}}Command = createCommand({
  build: {
    slash: {
      name: "{{name}}",
      nameLocalizations: t => t("commands.{{name}}.name"),
      description: "A slash command",
      descriptionLocalizations: t => t("commands.{{name}}.description"),
    },
  },
  run: (ctx) => {
    return ctx.reply(ctx.t("commands.{{name}}.run"));
  },
});
