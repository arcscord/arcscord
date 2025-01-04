import { createCommand } from "arcscord";

export const {{name}}Command = createCommand({
  build: {
    name: "{{name}}",
    description: "A sub command",
  },
  run: (ctx) => {
    return ctx.reply("Hello world!");
  }
});