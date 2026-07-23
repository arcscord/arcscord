import type { BaseMessageOptions, PermissionsString } from "discord.js";
import type { MessageOptions, MiddlewareContext, MiddlewareMessageOptions } from "./type";
import { MessageFlags, PermissionsBitField } from "discord.js";

/**
 * Sends the middleware's cancellation message using the reply method that fits
 * the interaction state: `editReply` when the interaction is already deferred,
 * otherwise an ephemeral `reply`. Shared by every guard middleware.
 */
export function replyOrEditReply(
  ctx: MiddlewareContext,
  message: BaseMessageOptions,
): ReturnType<MiddlewareContext["reply"]> {
  return ctx.defer
    ? ctx.editReply(message)
    : ctx.reply({ flags: MessageFlags.Ephemeral, ...message });
}

/**
 * Returns the required permissions the bot is missing for the interaction.
 * Outside of a guild the bot is considered to have every permission, so an
 * empty list is returned. Shared by the command and component bot-permission
 * guards.
 */
export function missingBotPermissions(
  ctx: MiddlewareContext,
  permissions: PermissionsString[],
): PermissionsString[] {
  if (!ctx.interaction.inGuild()) {
    return [];
  }

  const botPermissions = new PermissionsBitField(ctx.interaction.appPermissions ?? 0n);
  return permissions.filter(permission => !botPermissions.has(permission));
}

export function normalizeUserIds(userIds: Iterable<string>): Set<string> {
  return new Set(
    [...userIds]
      .map(userId => userId.trim())
      .filter(userId => userId.length > 0),
  );
}

export function resolveMessage<
  O extends { [key: string]: unknown } | undefined,
  C extends MiddlewareContext,
>(
  message: MessageOptions<O, C>,
  ctx: C,
  options?: O,
): BaseMessageOptions {
  if (typeof message !== "function") {
    return message;
  }

  return message({
    ...(options ?? {}),
    ctx,
    locale: ctx.locale,
    t: ctx.t,
  } as MiddlewareMessageOptions<O, C>);
}
