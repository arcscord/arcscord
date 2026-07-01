import { createCommand } from "arcscord";

export const {{name}}Command = createCommand({
  user: {
    name: "{{name}}",
  },
  run: (ctx) => {
    return ctx.reply("Hello world!");
  },
});