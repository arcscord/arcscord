import { createCommand } from "arcscord";

export const {{name}}Command = createCommand({
  build: {
    slash: {
      name: "{{name}}",
      description: "A slash command",
    },
  },
  run: (ctx) => {
    return ctx.reply("Hello world!");
  },
});
