import type {
  ButtonComponentData,
  ContainerComponentData,
  FileComponentData,
  MediaGalleryComponentData,
  SectionComponentData,
  SeparatorComponentData,
  TextDisplayComponentData,
  ThumbnailComponentData,
} from "discord.js";
import type { ComponentInContainer, Container, Section, TextDisplay, Thumbnail } from "../shared/component_definer.type";
import type {
  ButtonInput,
} from "../shared/to_api";
import type {
  ButtonActionRow,
  ContainerChild,
  ContainerOptions,
  DisplayButton,
  FileOptions,
  MediaGalleryOptions,
  MessageV2Child,
  MessageV2Component,
  MessageV2EditOptions,
  MessageV2EditReplyOptions,
  MessageV2Options,
  MessageV2ReplyOptions,
  SectionAccessory,
  SectionAccessoryValue,
  SectionInput,
  SectionOptions,
  SectionTextInput,
  SeparatorOptions,
  TextDisplayOptions,
  ThumbnailOptions,
} from "./types";
import { ComponentType } from "discord-api-types/v10";
import { MessageFlags } from "discord.js";
import {
  buttonToAPI,
  componentInContainerToAPI,
  containerToAPI,
  fileToAPI,
  mediaGalleryToAPI,
  sectionToAPI,
  separatorToAPI,
  textDisplayToAPI,
  thumbnailToAPI,
} from "../shared/to_api";

const sectionAccessoryBrand = Symbol("arcscord.sectionAccessory");

type ButtonList
  = | [DisplayButton]
    | [DisplayButton, DisplayButton]
    | [DisplayButton, DisplayButton, DisplayButton]
    | [DisplayButton, DisplayButton, DisplayButton, DisplayButton]
    | [DisplayButton, DisplayButton, DisplayButton, DisplayButton, DisplayButton];

function hasType(value: unknown): value is { readonly type: ComponentType } {
  return typeof value === "object" && value !== null && "type" in value;
}

function isOptionsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !hasType(value);
}

function isSectionAccessory(value: SectionInput): value is SectionAccessory {
  return typeof value === "object"
    && value !== null
    && sectionAccessoryBrand in value;
}

function textInputToDisplay(input: SectionTextInput): TextDisplayComponentData {
  if (typeof input === "string") {
    return text(input);
  }

  return textDisplayToAPI(input as TextDisplay);
}

function accessoryToAPI(input: SectionAccessoryValue): ButtonComponentData | ThumbnailComponentData {
  if ("toJSON" in input) {
    return buttonToAPI(input);
  }

  if (input.type === ComponentType.Thumbnail) {
    return thumbnailToAPI(input as Thumbnail);
  }

  return buttonToAPI(input as ButtonInput);
}

function messageChildToAPI(child: MessageV2Child): MessageV2Component {
  if (typeof child === "string") {
    return text(child);
  }

  if (child.type === ComponentType.Container) {
    return containerToAPI(child as never) as MessageV2Component;
  }

  return componentInContainerToAPI(child as never) as MessageV2Component;
}

/**
 * Creates a Discord components v2 message payload.
 *
 * The helper enables the `IsComponentsV2` flag and converts string children to text display components.
 * Components v2 messages use components as the message body, so `content`, `embeds`, `poll`,
 * and `stickers` are intentionally not accepted by this helper.
 *
 * By default the returned payload is edit-compatible, so it can be passed to `reply`, `editReply`,
 * `updateMessage` and `message.edit`. Passing reply-only options (`ephemeral`, `tts`, …) narrows the
 * result to a reply payload. Note that `IsComponentsV2` must already be set on the original message:
 * Discord does not allow toggling the flag on an edit.
 */
export function v2Message(
  child: MessageV2Child,
  ...children: MessageV2Child[]
): MessageV2EditReplyOptions;
export function v2Message(
  options: MessageV2EditOptions,
  child: MessageV2Child,
  ...children: MessageV2Child[]
): MessageV2EditReplyOptions;
export function v2Message(
  options: MessageV2Options,
  child: MessageV2Child,
  ...children: MessageV2Child[]
): MessageV2ReplyOptions;
export function v2Message(
  first: MessageV2EditOptions | MessageV2Options | MessageV2Child,
  ...children: MessageV2Child[]
): MessageV2EditReplyOptions | MessageV2ReplyOptions {
  const options = isOptionsObject(first) ? first as MessageV2EditOptions : {};
  const allChildren = isOptionsObject(first)
    ? children
    : [first as MessageV2Child, ...children];

  return {
    ...options,
    flags: (Number(options.flags ?? 0) | MessageFlags.IsComponentsV2) as MessageV2EditReplyOptions["flags"],
    components: allChildren.map(messageChildToAPI),
  };
}

/**
 * Creates a button action row.
 *
 * Action rows are layout components for interactive controls. Discord allows up to five
 * buttons in one action row; the tuple type enforces that limit for buttons built here.
 */
export function actionRow(
  ...buttons: ButtonList
): ButtonActionRow {
  return {
    type: ComponentType.ActionRow,
    components: buttons.map(button => buttonToAPI(button)),
  };
}

/**
 * Creates a text display component from markdown content.
 *
 * Text displays are the v2 replacement for plain message content inside component layouts.
 */
export function text(content: string, options: TextDisplayOptions = {}): TextDisplayComponentData {
  return textDisplayToAPI({
    ...options,
    type: ComponentType.TextDisplay,
    content,
  });
}

/**
 * Creates a thumbnail component.
 *
 * A thumbnail can be used as a Section accessory when a compact visual is needed next
 * to one or more text displays.
 */
export function thumbnail(options: ThumbnailOptions): ThumbnailComponentData {
  return thumbnailToAPI({
    ...options,
    type: ComponentType.Thumbnail,
  });
}

/**
 * Marks a button or thumbnail as a section accessory.
 *
 * Section accessories are deliberately wrapped so TypeScript rejects a raw button in the
 * text portion of `section(...)`.
 */
export function accessory(value: SectionAccessoryValue): SectionAccessory {
  return {
    [sectionAccessoryBrand]: true,
    value,
  } as unknown as SectionAccessory;
}

/**
 * Creates a section with one or more text displays and a required accessory.
 *
 * A section contains text display content plus exactly one accessory. The accessory can be
 * a button or a thumbnail, and strings are converted to Text Display components.
 *
 * @example
 * ```ts
 * section(
 *   "Support",
 *   "Clique pour ouvrir un ticket.",
 *   accessory(button({ customId: "support", style: "primary", label: "Open" })),
 * );
 * ```
 */
export function section(
  ...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory]
): SectionComponentData;
export function section(
  options: SectionOptions,
  ...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory]
): SectionComponentData;
export function section(
  first: SectionOptions | SectionTextInput,
  ...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory] | [...SectionTextInput[], SectionAccessory]
): SectionComponentData {
  const options = isOptionsObject(first) ? first as SectionOptions : {};
  const allItems = isOptionsObject(first)
    ? items
    : [first, ...items] as [SectionTextInput, ...SectionTextInput[], SectionAccessory];
  const possibleAccessory = allItems.at(-1);

  if (!possibleAccessory || !isSectionAccessory(possibleAccessory)) {
    throw new TypeError("section requires accessory(...) as its last argument");
  }

  const sectionText = allItems.slice(0, -1) as SectionTextInput[];

  return sectionToAPI({
    ...options,
    type: ComponentType.Section,
    components: sectionText.map(textInputToDisplay),
    accessory: accessoryToAPI(possibleAccessory.value),
  } as unknown as Section);
}

/**
 * Creates a separator component.
 *
 * Separators create visual breaks between display components inside containers or messages.
 */
export function separator(options: SeparatorOptions = {}): SeparatorComponentData {
  return separatorToAPI({
    ...options,
    type: ComponentType.Separator,
  });
}

/**
 * Creates a media gallery component.
 *
 * Media galleries group one or more unfurled media items in a components v2 layout.
 */
export function mediaGallery(options: MediaGalleryOptions): MediaGalleryComponentData {
  return mediaGalleryToAPI({
    ...options,
    type: ComponentType.MediaGallery,
  });
}

/**
 * Creates a file component referencing an uploaded attachment or unfurled media item.
 */
export function file(options: FileOptions): FileComponentData {
  return fileToAPI({
    ...options,
    type: ComponentType.File,
  });
}

/**
 * Creates a container component from v2 display children.
 *
 * Containers group display components such as text displays, sections, separators,
 * media galleries, files, and button action rows. Strings are accepted as a shorthand
 * for Text Display children.
 */
export function container(
  child: ContainerChild,
  ...children: ContainerChild[]
): ContainerComponentData;
export function container(
  options: ContainerOptions,
  child: ContainerChild,
  ...children: ContainerChild[]
): ContainerComponentData;
export function container(
  first: ContainerOptions | ContainerChild,
  ...children: ContainerChild[]
): ContainerComponentData {
  const options = isOptionsObject(first) ? first as ContainerOptions : {};
  const allChildren = isOptionsObject(first)
    ? children
    : [first, ...children];

  return containerToAPI({
    ...options,
    type: ComponentType.Container,
    components: allChildren.map(component => componentInContainerToAPI(component as ComponentInContainer)),
  } as unknown as Container);
}
