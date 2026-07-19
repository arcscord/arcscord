import type { APIThumbnailComponent } from "discord-api-types/v10";
import type { ThumbnailComponentData } from "discord.js";
import type { CanonicalComponentData, ComponentBuilderLike } from "./component";
import { ComponentType } from "discord-api-types/v10";
import { rootContext } from "./validation/context";
import { decodeThumbnail } from "./validation/display";

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
export function thumbnail(options: ThumbnailOptions): CanonicalComponentData<ThumbnailComponentData, ComponentType.Thumbnail> {
  return decodeThumbnail({ ...options, type: ComponentType.Thumbnail }, rootContext("thumbnail"));
}
