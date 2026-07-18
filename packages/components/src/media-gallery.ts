import type { APIMediaGalleryComponent, APIMediaGalleryItem } from "discord-api-types/v10";
import type { MediaGalleryComponentData, MediaGalleryItemData } from "discord.js";
import type { ComponentBuilderLike } from "./component";
import { ComponentType } from "discord-api-types/v10";
import { normalizeMediaGallery, normalizeMediaGalleryItem } from "./internal/normalize-display";

/** Discord.js data, a `MediaGalleryItemBuilder`, or raw API gallery item. */
export type MediaGalleryItemInput
  = | MediaGalleryItemData
    | APIMediaGalleryItem
    | ComponentBuilderLike<APIMediaGalleryItem>;

/** Discord.js data, builder, or raw API media gallery accepted by layout helpers. */
export type MediaGalleryComponentInput
  = | MediaGalleryComponentData
    | APIMediaGalleryComponent
    | ComponentBuilderLike<APIMediaGalleryComponent>;

/** Options for {@link mediaGallery}; every item may independently use any supported form. */
export type MediaGalleryOptions = Omit<MediaGalleryComponentData, "type" | "items"> & {
  readonly items: readonly MediaGalleryItemInput[];
};

/**
 * Creates a media gallery.
 *
 * @param options - Gallery options containing Discord.js item data, `MediaGalleryItemBuilder`
 * instances, or raw `APIMediaGalleryItem` objects.
 * @example
 * ```ts
 * mediaGallery({ items: [{ media: { url: "https://example.com/image.png" } }] })
 * ```
 */
export function mediaGallery(options: MediaGalleryOptions): MediaGalleryComponentData {
  return normalizeMediaGallery({
    ...options,
    type: ComponentType.MediaGallery,
    items: options.items.map(normalizeMediaGalleryItem),
  });
}
