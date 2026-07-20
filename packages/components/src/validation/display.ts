import type {
  FileComponentData,
  MediaGalleryComponentData,
  MediaGalleryItemData,
  SeparatorComponentData,
  TextDisplayComponentData,
  ThumbnailComponentData,
  UnfurledMediaItemData,
} from "discord.js";
import type { CanonicalComponentData } from "../component";
import type { FileComponentInput } from "../file";
import type { MediaGalleryComponentInput, MediaGalleryItemInput } from "../media-gallery";
import type { SeparatorComponentInput } from "../separator";
import type { TextDisplayInput } from "../text";
import type { ThumbnailInput } from "../thumbnail";
import type { ValidationContext } from "./context";
import { ComponentType, SeparatorSpacingSize } from "discord-api-types/v10";
import {
  childContext,
  rootContext,
  serializeInput,
  validationFailure,
} from "./context";
import {
  assertComponentType,
  decodeArray,
  decodeBoolean,
  decodeComponentId,
  decodeNullableString,
  decodeRecord,
  decodeString,
  decodeUrl,
  optionalField,
  requiredField,
} from "./decoders";

type CanonicalFile = CanonicalComponentData<FileComponentData, ComponentType.File>;
type CanonicalMediaGallery = CanonicalComponentData<MediaGalleryComponentData, ComponentType.MediaGallery>;
type CanonicalSeparator = CanonicalComponentData<SeparatorComponentData, ComponentType.Separator>;
type CanonicalTextDisplay = CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>;
type CanonicalThumbnail = CanonicalComponentData<ThumbnailComponentData, ComponentType.Thumbnail>;

function decodeMedia(value: unknown, context: ValidationContext, protocols: readonly string[], componentType: number): UnfurledMediaItemData {
  const record = decodeRecord(value, context, componentType);
  const url = requiredField(record, "url", context, (field, fieldContext) => decodeUrl(field, fieldContext, protocols, componentType));
  return { url } satisfies UnfurledMediaItemData;
}

export function decodeTextDisplay(input: unknown, context: ValidationContext): CanonicalTextDisplay {
  if (typeof input === "string") {
    return {
      type: ComponentType.TextDisplay,
      content: decodeString(input, context, 1, 4000, ComponentType.TextDisplay),
    } satisfies CanonicalTextDisplay;
  }
  const record = serializeInput(input, context);
  assertComponentType(record, ComponentType.TextDisplay, context);
  const id = decodeComponentId(record, context);
  const content = requiredField(record, "content", context, (value, fieldContext) => decodeString(value, fieldContext, 1, 4000, ComponentType.TextDisplay));
  return {
    type: ComponentType.TextDisplay,
    content,
    ...(id === undefined ? {} : { id }),
  } satisfies CanonicalTextDisplay;
}

export function decodeThumbnail(input: unknown, context: ValidationContext): CanonicalThumbnail {
  const record = serializeInput(input, context);
  assertComponentType(record, ComponentType.Thumbnail, context);
  const id = decodeComponentId(record, context);
  const media = requiredField(record, "media", context, (value, fieldContext) => decodeMedia(value, fieldContext, [], ComponentType.Thumbnail));
  const description = optionalField(record, "description", context, (value, fieldContext) => decodeNullableString(value, fieldContext, 1, 1024, ComponentType.Thumbnail));
  const spoiler = optionalField(record, "spoiler", context, (value, fieldContext) => decodeBoolean(value, fieldContext, ComponentType.Thumbnail));
  return {
    type: ComponentType.Thumbnail,
    media,
    ...(id === undefined ? {} : { id }),
    ...(description === undefined || description === null ? {} : { description }),
    ...(spoiler === undefined ? {} : { spoiler }),
  } satisfies CanonicalThumbnail;
}

function decodeMediaGalleryItem(input: unknown, context: ValidationContext): MediaGalleryItemData {
  const record = serializeInput(input, context);
  const media = requiredField(record, "media", context, (value, fieldContext) => decodeMedia(value, fieldContext, [], ComponentType.MediaGallery));
  const description = optionalField(record, "description", context, (value, fieldContext) => decodeNullableString(value, fieldContext, 1, 1024, ComponentType.MediaGallery));
  const spoiler = optionalField(record, "spoiler", context, (value, fieldContext) => decodeBoolean(value, fieldContext, ComponentType.MediaGallery));
  return {
    media,
    ...(description === undefined || description === null ? {} : { description }),
    ...(spoiler === undefined ? {} : { spoiler }),
  } satisfies MediaGalleryItemData;
}

export function decodeMediaGallery(input: unknown, context: ValidationContext): CanonicalMediaGallery {
  const record = serializeInput(input, context);
  assertComponentType(record, ComponentType.MediaGallery, context);
  const id = decodeComponentId(record, context);
  const items = decodeArray(record.items, childContext(context, "items"), 1, 10, "media-gallery-cardinality", ComponentType.MediaGallery, decodeMediaGalleryItem);
  return {
    type: ComponentType.MediaGallery,
    items,
    ...(id === undefined ? {} : { id }),
  } satisfies CanonicalMediaGallery;
}

export function decodeFile(input: unknown, context: ValidationContext): CanonicalFile {
  const record = serializeInput(input, context);
  assertComponentType(record, ComponentType.File, context);
  const id = decodeComponentId(record, context);
  const file = requiredField(record, "file", context, (value, fieldContext) => decodeMedia(value, fieldContext, ["attachment:"], ComponentType.File));
  const spoiler = optionalField(record, "spoiler", context, (value, fieldContext) => decodeBoolean(value, fieldContext, ComponentType.File));
  return {
    type: ComponentType.File,
    file,
    ...(id === undefined ? {} : { id }),
    ...(spoiler === undefined ? {} : { spoiler }),
  } satisfies CanonicalFile;
}

function decodeSpacing(value: unknown, context: ValidationContext): SeparatorSpacingSize {
  if (value === "small" || value === SeparatorSpacingSize.Small) {
    return SeparatorSpacingSize.Small;
  }
  if (value === "large" || value === SeparatorSpacingSize.Large) {
    return SeparatorSpacingSize.Large;
  }
  validationFailure(context, "separator-spacing", `${context.path} must be small or large`, ComponentType.Separator, { actual: value });
}

export function decodeSeparator(input: unknown, context: ValidationContext): CanonicalSeparator {
  const record = serializeInput(input, context);
  assertComponentType(record, ComponentType.Separator, context);
  const id = decodeComponentId(record, context);
  const divider = optionalField(record, "divider", context, (value, fieldContext) => decodeBoolean(value, fieldContext, ComponentType.Separator));
  const spacing = optionalField(record, "spacing", context, decodeSpacing);
  return {
    type: ComponentType.Separator,
    ...(id === undefined ? {} : { id }),
    ...(divider === undefined ? {} : { divider }),
    ...(spacing === undefined ? {} : { spacing }),
  } satisfies CanonicalSeparator;
}

/** Validates and normalizes a text display or string shorthand. */
export function validateTextDisplay(input: TextDisplayInput): CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay> {
  return decodeTextDisplay(input, rootContext("textDisplay"));
}

/** Validates and normalizes a thumbnail. */
export function validateThumbnail(input: ThumbnailInput): CanonicalComponentData<ThumbnailComponentData, ComponentType.Thumbnail> {
  return decodeThumbnail(input, rootContext("thumbnail"));
}

/** Validates and normalizes one media-gallery item. */
export function validateMediaGalleryItem(input: MediaGalleryItemInput): MediaGalleryItemData {
  return decodeMediaGalleryItem(input, rootContext("mediaGalleryItem"));
}

/** Validates and normalizes a media gallery recursively. */
export function validateMediaGallery(input: MediaGalleryComponentInput): CanonicalComponentData<MediaGalleryComponentData, ComponentType.MediaGallery> {
  return decodeMediaGallery(input, rootContext("mediaGallery"));
}

/** Validates and normalizes a file component. */
export function validateFile(input: FileComponentInput): CanonicalComponentData<FileComponentData, ComponentType.File> {
  return decodeFile(input, rootContext("file"));
}

/** Validates and normalizes a separator. */
export function validateSeparator(input: SeparatorComponentInput): CanonicalComponentData<SeparatorComponentData, ComponentType.Separator> {
  return decodeSeparator(input, rootContext("separator"));
}
