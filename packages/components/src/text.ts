import type { APITextDisplayComponent } from "discord-api-types/v10";
import type { TextDisplayComponentData } from "discord.js";
import type { CanonicalComponentData, ComponentBuilderLike } from "./component";
import { ComponentType } from "discord-api-types/v10";
import { rootContext } from "./validation/context";
import { decodeTextDisplay } from "./validation/display";

/** A string, Discord.js data/builder, or raw API text display accepted by layout helpers. */
export type TextDisplayInput
  = | string
    | TextDisplayComponentData
    | APITextDisplayComponent
    | ComponentBuilderLike<APITextDisplayComponent>;

/** Options for {@link text}, derived from Discord.js component data. */
export type TextDisplayOptions = Omit<TextDisplayComponentData, "type" | "content">;

/**
 * Creates a Discord Components V2 text display.
 *
 * @param content - Discord Markdown content.
 * @param options - Optional Discord.js fields such as `id`; text displays have no children.
 * @example
 * ```ts
 * text("## Status\nEverything is operational.", { id: 1 })
 * ```
 */
export function text(content: string, options: TextDisplayOptions = {}): CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay> {
  return decodeTextDisplay({ ...options, type: ComponentType.TextDisplay, content }, rootContext("textDisplay"));
}
