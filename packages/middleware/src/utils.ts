import type { BaseMessageOptions } from "discord.js";
import type { MessageOptions, MiddlewareContext, MiddlewareMessageOptions } from "./type";

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
