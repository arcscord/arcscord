import process from "node:process";
import {
  CommandBotPermissionMiddleware,
  CommandUserAllowListMiddleware,
  CooldownMiddleware,
} from "@arcscord/middleware";
import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";
import {
  commandAllowListMessage,
  commandBotPermissionMessage,
  commandCooldownMessage,
} from "../utils/middleware_messages";

const allowedUserIds = (process.env.MIDDLEWARE_ALLOWED_USER_IDS ?? "0")
  .split(",")
  .map(userId => userId.trim())
  .filter(Boolean);

export const middlewareCooldownCommand = createCommand({
  build: {
    slash: {
      name: "middleware-cooldown",
      description: "Test CooldownMiddleware",
    },
  },
  use: [
    new CooldownMiddleware(10, commandCooldownMessage),
  ],
  run: ctx => ctx.reply(ctx.t($ => $.middleware.command.ok), {
    flags: MessageFlags.Ephemeral,
  }),
});

export const middlewareAllowListCommand = createCommand({
  build: {
    slash: {
      name: "middleware-allow-list",
      description: "Test CommandUserAllowListMiddleware",
    },
  },
  use: [
    new CommandUserAllowListMiddleware(allowedUserIds, commandAllowListMessage),
  ],
  run: ctx => ctx.reply(ctx.t($ => $.middleware.command.ok), {
    flags: MessageFlags.Ephemeral,
  }),
});

export const middlewareBotPermissionCommand = createCommand({
  build: {
    slash: {
      name: "middleware-bot-permission",
      description: "Test CommandBotPermissionMiddleware",
      contexts: ["guild"],
    },
  },
  use: [
    new CommandBotPermissionMiddleware(["ManageMessages"], commandBotPermissionMessage),
  ],
  run: ctx => ctx.reply(ctx.t($ => $.middleware.command.ok), {
    flags: MessageFlags.Ephemeral,
  }),
});
