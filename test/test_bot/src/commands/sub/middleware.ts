import { CommandBotPermissionMiddleware } from "@arcscord/middleware";
import { createSubCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { commandBotPermissionMessage } from "../../utils/middleware_messages";

export const testMiddlewareSubCommand = createSubCommand({
  name: "test-middleware",
  description: "test",
  use: [new CommandBotPermissionMiddleware(["ManageMessages"], commandBotPermissionMessage)],
  run: (ctx) => {
    return ctx.reply(ctx.t($ => $.middleware.command.ok), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
