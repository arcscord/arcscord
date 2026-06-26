import type { CommandContext, ComponentContext } from "arcscord";
import type { BaseMessageOptions } from "discord.js";

export type MiddlewareContext = CommandContext | ComponentContext;

export type MiddlewareMessageContext<C extends MiddlewareContext = MiddlewareContext> = {
  /**
   * The Arcscord context that triggered the middleware.
   */
  ctx: C;

  /**
   * Detected i18next language for this interaction.
   */
  locale: C["locale"];

  /**
   * Fixed translation function for the detected interaction locale.
   */
  t: C["t"];
};

export type MiddlewareMessageOptions<
  O extends { [key: string]: unknown } | undefined = undefined,
  C extends MiddlewareContext = MiddlewareContext,
> = O extends undefined
  ? MiddlewareMessageContext<C>
  : O & MiddlewareMessageContext<C>;

/**
 * Message configuration used by middleware.
 *
 * Without callback options, this is a static Discord message object. With
 * callback options, this is a function that receives middleware-specific data
 * and returns the Discord message object to send.
 */
export type MessageOptions<
  O extends { [key: string]: unknown } | undefined = undefined,
  C extends MiddlewareContext = MiddlewareContext,
> = BaseMessageOptions | ((options: MiddlewareMessageOptions<O, C>) => BaseMessageOptions);
