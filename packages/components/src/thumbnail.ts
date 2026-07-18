import type { APIThumbnailComponent } from "discord-api-types/v10";
import type { ThumbnailComponentData } from "discord.js";
import type { ComponentBuilderLike } from "./component";
import { ComponentType } from "discord-api-types/v10";
import { normalizeThumbnail } from "./internal/normalize-display";

/** Discord.js data/builder or raw API thumbnail accepted by {@link accessory}. */
export type ThumbnailInput
  = | ThumbnailComponentData
    | APIThumbnailComponent
    | ComponentBuilderLike<APIThumbnailComponent>;

/** Options for {@link thumbnail}, derived from Discord.js component data. */
export type ThumbnailOptions = Omit<ThumbnailComponentData, "type">;

/**
 * Creates a thumbnail for a section accessory.
 *
 * @param options - Required `media` plus optional `description`, `spoiler`, and `id`.
 * @example
 * ```ts
 * thumbnail({ media: { url: "https://example.com/icon.png" }, description: "Status icon" })
 * ```
 */
export function thumbnail(options: ThumbnailOptions): ThumbnailComponentData {
  return normalizeThumbnail({ ...options, type: ComponentType.Thumbnail });
}
