import type { BaseMessageOptions } from "discord.js";
import type { ArcClient } from "#/base/client/client.class";

export function internalErrorEmbed(
  client: ArcClient,
  id?: string,
): BaseMessageOptions {
  return client.getErrorMessage(id);
}
