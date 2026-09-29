import { CommandBotPermissionMiddleware } from "@arcscord/middleware";
import { createSubCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import { localization } from "../../localization";
import { commandBotPermissionMessage } from "../../utils/middleware_messages";

export const testMiddlewareSubCommand = createSubCommand({
  name: "test-middleware",
  description: "test",
  use: [new CommandBotPermissionMiddleware(["ManageMessages"], commandBotPermissionMessage)],
  run: (ctx) => {
    const m = localization.getFixed(ctx);
    return ctx.reply(m.middleware_command_ok(), {
      flags: MessageFlags.Ephemeral,
    });
  },
});
