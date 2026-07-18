import type {
  FileComponentData,
  MediaGalleryComponentData,
  MediaGalleryItemData,
  SectionComponentData,
  SeparatorComponentData,
  TextDisplayComponentData,
  ThumbnailComponentData,
} from "discord.js";
import type { DisplayButton } from "../action-row";
import type { FileComponentInput } from "../file";
import type { MediaGalleryComponentInput, MediaGalleryItemInput } from "../media-gallery";
import type { SectionAccessoryValue, SectionComponentInput, SectionTextInput } from "../section";
import type { SeparatorComponentInput } from "../separator";
import type { ThumbnailInput } from "../thumbnail";
import { ComponentType, SeparatorSpacingSize } from "discord-api-types/v10";
import { normalizeButton } from "./normalize-action-row";
import { serializeComponent } from "./serialize";

/** Normalizes text shorthand, data, raw API input, or a builder. */
export function normalizeTextDisplay(input: SectionTextInput): TextDisplayComponentData {
  if (typeof input === "string") {
    return { type: ComponentType.TextDisplay, content: input };
  }

  const display = serializeComponent(input);
  return {
    type: ComponentType.TextDisplay,
    id: display?.id as number | undefined,
    content: display.content as string,
  };
}

/** Normalizes thumbnail data, raw API input, or a builder. */
export function normalizeThumbnail(input: ThumbnailInput): ThumbnailComponentData {
  const thumbnail = serializeComponent(input);
  return {
    type: ComponentType.Thumbnail,
    id: thumbnail.id as number | undefined,
    media: thumbnail.media as ThumbnailComponentData["media"],
    description: thumbnail.description as string | undefined,
    spoiler: thumbnail.spoiler as boolean | undefined,
  };
}

/** Normalizes a section's button or thumbnail accessory. */
export function normalizeAccessory(input: SectionAccessoryValue): SectionComponentData["accessory"] {
  const accessory = serializeComponent(input);
  if (accessory.type === ComponentType.Thumbnail) {
    return normalizeThumbnail(input as ThumbnailInput);
  }

  if (accessory.type === ComponentType.Button || (accessory.type === undefined && "style" in accessory)) {
    return normalizeButton(input as DisplayButton);
  }

  throw new TypeError(`Unsupported section accessory type: ${String(accessory.type)}`);
}

/** Normalizes a complete section recursively. */
export function normalizeSection(input: SectionComponentInput): SectionComponentData {
  const section = serializeComponent(input);
  return {
    type: ComponentType.Section,
    id: section.id as number | undefined,
    components: (section.components as readonly SectionTextInput[]).map(normalizeTextDisplay),
    accessory: normalizeAccessory(section.accessory as SectionAccessoryValue),
  };
}

/** Normalizes one media gallery item. */
export function normalizeMediaGalleryItem(input: MediaGalleryItemInput): MediaGalleryItemData {
  const item = serializeComponent(input);
  return {
    media: item.media as MediaGalleryItemData["media"],
    description: item.description as string | undefined,
    spoiler: item.spoiler as boolean | undefined,
  };
}

/** Normalizes a media gallery and all its items. */
export function normalizeMediaGallery(input: MediaGalleryComponentInput): MediaGalleryComponentData {
  const gallery = serializeComponent(input);
  return {
    type: ComponentType.MediaGallery,
    id: gallery.id as number | undefined,
    items: (gallery.items as readonly MediaGalleryItemInput[]).map(normalizeMediaGalleryItem),
  };
}

/** Normalizes a file component. */
export function normalizeFile(input: FileComponentInput): FileComponentData {
  const file = serializeComponent(input);
  return {
    type: ComponentType.File,
    id: file.id as number | undefined,
    file: file.file as FileComponentData["file"],
    spoiler: file.spoiler as boolean | undefined,
  };
}

/** Normalizes a separator and resolves string spacing shortcuts. */
export function normalizeSeparator(input: SeparatorComponentInput): SeparatorComponentData {
  const separator = serializeComponent(input);
  const spacing = separator.spacing === "small"
    ? SeparatorSpacingSize.Small
    : separator.spacing === "large"
      ? SeparatorSpacingSize.Large
      : separator.spacing as SeparatorSpacingSize | undefined;
  return {
    type: ComponentType.Separator,
    id: separator.id as number | undefined,
    divider: separator.divider as boolean | undefined,
    spacing,
  };
}
