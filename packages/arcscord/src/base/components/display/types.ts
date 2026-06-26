import type {
  ActionRowData,
  ButtonBuilder,
  ButtonComponentData,
  ComponentEmojiResolvable,
  ContainerComponentData,
  FileComponentData,
  InteractionReplyOptions,
  MediaGalleryComponentData,
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

export type ButtonOptions = Omit<Button, "type">;

export type LinkButtonOptions = Extract<ButtonOptions, { url: string }> & {
  readonly label?: string;
  readonly emoji?: ComponentEmojiResolvable;
};
