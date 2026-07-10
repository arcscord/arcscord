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

export type MessageV2Options = Omit<InteractionReplyOptions, "components" | "content" | "embeds" | "poll" | "stickers">;
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

export type DisplayButton = Button | ButtonBuilder;

export type ButtonActionRow = ActionRowData<ButtonComponentData>;

export type SectionTextInput = TextDisplayInput;

export type SectionAccessoryValue = Button | Thumbnail | ThumbnailComponentData | ButtonBuilder;

declare const sectionAccessoryBrand: unique symbol;

export type SectionAccessory = {
  readonly [sectionAccessoryBrand]: true;
  readonly value: SectionAccessoryValue;
};

export type SectionInput = SectionTextInput | SectionAccessory;

export type ContainerChild
  = | string
    | ButtonActionRow
    | FileComponentData
    | MediaGalleryComponentData
    | SectionComponentData
    | SeparatorComponentData
    | TextDisplayComponentData;

export type MessageV2Child
  = | string
    | ButtonActionRow
    | ContainerComponentData
    | FileComponentData
    | MediaGalleryComponentData
    | SectionComponentData
    | SeparatorComponentData
    | TextDisplayComponentData;

export type MessageV2Component = Exclude<MessageV2Child, string>;

export type TextDisplayOptions = Omit<TextDisplay, "type" | "content">;

export type ThumbnailOptions = Omit<Thumbnail, "type">;

export type SectionOptions = Omit<Section, "type" | "components" | "accessory">;

export type ContainerOptions = Omit<Container, "type" | "components">;

export type MediaGalleryOptions = Omit<MediaGallery, "type">;

export type FileOptions = Omit<File, "type">;

export type SeparatorOptions = Omit<Separator, "type">;
