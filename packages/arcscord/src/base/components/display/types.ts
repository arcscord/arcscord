import type {
  ActionRowData,
  ButtonBuilder,
  ButtonComponentData,
  ContainerComponentData,
  FileComponentData,
  InteractionReplyOptions,
  MediaGalleryComponentData,
  MessageEditOptions,
  MessageFlags,
  SectionComponentData,
  SeparatorComponentData,
  TextDisplayComponentData,
  ThumbnailComponentData,
} from "discord.js";
import type {
  Button,
  Container,
  File,
  MediaGallery,
  Section,
  Separator,
  TextDisplay,
  TextDisplayInput,
  Thumbnail,
} from "../shared/component_definer.type";

/**
 * Reply options for a Components v2 message, derived from `InteractionReplyOptions`
 * with the fields incompatible with v2 (`components`, `content`, `embeds`, `poll`,
 * `stickers`) removed. The components are supplied separately — see {@link MessageV2ReplyOptions}.
 */
export type MessageV2Options = Omit<InteractionReplyOptions, "components" | "content" | "embeds" | "poll" | "stickers">;
/**
 * Full reply payload produced by {@link v2Message}: {@link MessageV2Options} plus
 * the required list of top-level components.
 */
export type MessageV2ReplyOptions = MessageV2Options & {
  readonly components: readonly MessageV2Component[];
};

/**
 * Components v2 options usable for both initial replies and message updates/edits.
 *
 * Derived from `MessageEditOptions` so the produced payload is assignable to
 * `reply`, `editReply`, `updateMessage` and `message.edit`. It intentionally
 * omits the reply-only fields (`ephemeral`, `tts`, …) carried by {@link MessageV2Options}.
 */
export type MessageV2EditOptions = Omit<MessageEditOptions, "components" | "content" | "embeds">;

/**
 * Output payload of {@link v2Message} when no reply-only option is given.
 *
 * `flags` is narrowed to the literal flag union shared by reply and edit payloads.
 * Discord's `BitFieldResolvable` is contravariant, so neither the wide reply nor the
 * narrow edit `flags` type is assignable to the other — typing the field as the literal
 * union is what makes the payload accepted by every send/edit method.
 */
export type MessageV2EditReplyOptions = Omit<MessageV2EditOptions, "flags"> & {
  readonly components: readonly MessageV2Component[];
  readonly flags?: MessageFlags.IsComponentsV2 | MessageFlags.SuppressEmbeds;
};

/** A button usable in display components: an arcscord {@link Button} definition or a discord.js `ButtonBuilder`. */
export type DisplayButton = Button | ButtonBuilder;

/** An action row holding message buttons, used inside containers and v2 messages. */
export type ButtonActionRow = ActionRowData<ButtonComponentData>;

/** Text content accepted inside a {@link section}; alias of {@link TextDisplayInput}. */
export type SectionTextInput = TextDisplayInput;

/** The accessory value of a {@link section}: a button or thumbnail, as a definition or builder. */
export type SectionAccessoryValue = Button | Thumbnail | ThumbnailComponentData | ButtonBuilder;

declare const sectionAccessoryBrand: unique symbol;

/** Branded wrapper produced by {@link accessory} marking a value as a section accessory. */
export type SectionAccessory = {
  readonly [sectionAccessoryBrand]: true;
  readonly value: SectionAccessoryValue;
};

/** Any child accepted by {@link section}: text content or an {@link SectionAccessory}. */
export type SectionInput = SectionTextInput | SectionAccessory;

/** Any component accepted inside a {@link container}. */
export type ContainerChild
  = | string
    | ButtonActionRow
    | FileComponentData
    | MediaGalleryComponentData
    | SectionComponentData
    | SeparatorComponentData
    | TextDisplayComponentData;

/** Any top-level child accepted by {@link v2Message} (a raw string or resolved component data). */
export type MessageV2Child
  = | string
    | ButtonActionRow
    | ContainerComponentData
    | FileComponentData
    | MediaGalleryComponentData
    | SectionComponentData
    | SeparatorComponentData
    | TextDisplayComponentData;

/** A resolved {@link MessageV2Child} with raw strings excluded. */
export type MessageV2Component = Exclude<MessageV2Child, string>;

/** Options for {@link text}: a {@link TextDisplay} without its `type` and `content`. */
export type TextDisplayOptions = Omit<TextDisplay, "type" | "content">;

/** Options for {@link thumbnail}: a {@link Thumbnail} without its `type`. */
export type ThumbnailOptions = Omit<Thumbnail, "type">;

/** Options for {@link section}: a {@link Section} without its `type`, `components` and `accessory`. */
export type SectionOptions = Omit<Section, "type" | "components" | "accessory">;

/** Options for {@link container}: a {@link Container} without its `type` and `components`. */
export type ContainerOptions = Omit<Container, "type" | "components">;

/** Options for {@link mediaGallery}: a {@link MediaGallery} without its `type`. */
export type MediaGalleryOptions = Omit<MediaGallery, "type">;

/** Options for {@link file}: a {@link File} without its `type`. */
export type FileOptions = Omit<File, "type">;

/** Options for {@link separator}: a {@link Separator} without its `type`. */
export type SeparatorOptions = Omit<Separator, "type">;
