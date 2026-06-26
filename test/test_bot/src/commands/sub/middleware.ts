import { CooldownMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { commandCooldownMessage } from "../../utils/middleware_messages";

export const testMiddlewareSubCommand = createCommand({
  build: {
    name: "test-middleware",
    description: "test",

  },
  use: [new CooldownMiddleware(10, commandCooldownMessage)],
  run: (ctx) => {
    return ctx.reply(ctx.t($ => $.middleware.command.ok), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
