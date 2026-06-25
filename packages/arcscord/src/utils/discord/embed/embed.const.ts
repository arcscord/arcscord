import type { BaseMessageOptions } from "discord.js";
import type { ArcClient } from "#/base/client/client.class";

export function internalErrorEmbed(
  client: ArcClient,
  id?: string,
  locale?: string,
): BaseMessageOptions {
  return client.getErrorMessage(id, locale);
}
