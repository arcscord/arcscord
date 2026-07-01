import { createSubCommand } from "arcscord";

export const {{name}}Command = createSubCommand({
  name: "{{name}}",
  description: "A sub command",
  run: (ctx) => {
    return ctx.reply("Hello world!");
  }
});