import { createCommand } from "arcscord";

export const {{name}}Command = createCommand({
  build: {
    user: {
      name: "{{name}}",
    },
  },
  run: (ctx) => {
    return ctx.reply("Hello world!");
  },
});