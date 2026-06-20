import type { BaseMessageOptions } from "discord.js";

/**
 * Message configuration used by middleware.
 *
 * Without callback options, this is a static Discord message object. With
 * callback options, this is a function that receives middleware-specific data
 * and returns the Discord message object to send.
 */
export type MessageOptions<O extends { [key: string]: unknown } | undefined = undefined> = O extends undefined
  ? BaseMessageOptions
  : (options: O) => BaseMessageOptions;
