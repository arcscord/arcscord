import type { ComponentType } from "discord-api-types/v10";
import type {
  FileComponentData,
  InteractionReplyOptions,
  MediaGalleryComponentData,
  MessageEditOptions,
  SeparatorComponentData,
  TextDisplayComponentData,
} from "discord.js";
import type { MessageActionRow } from "./action-row";
import type { CanonicalComponentData } from "./component";
import type { CanonicalContainerComponentData, ContainerChild, ContainerComponentInput } from "./container";
import type { CanonicalSectionComponentData } from "./section";
import { MessageFlags as DiscordMessageFlags } from "discord-api-types/v10";
import { isComponentInput, rootContext } from "./validation/context";
import { decodeMessageFlags, decodeV2Message } from "./validation/message";

/** Any top-level child accepted by {@link v2Message}. */
export type MessageV2Child = ContainerChild | ContainerComponentInput;

/** Resolved component data emitted by {@link v2Message}. */
export type MessageV2Component
  = | MessageActionRow
    | CanonicalContainerComponentData
    | CanonicalComponentData<FileComponentData, ComponentType.File>
    | CanonicalComponentData<MediaGalleryComponentData, ComponentType.MediaGallery>
    | CanonicalSectionComponentData
    | CanonicalComponentData<SeparatorComponentData, ComponentType.Separator>
    | CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>;

/** Reply options excluding fields Discord forbids on Components V2 messages. */
export type MessageV2Options = Omit<InteractionReplyOptions, "components" | "content" | "embeds" | "poll" | "stickers">;

/** Reply payload returned when reply-only options are supplied. */
export type MessageV2ReplyOptions = Omit<MessageV2Options, "flags"> & {
  readonly components: readonly MessageV2Component[];
  readonly flags: number;
};

/** Edit-compatible options excluding the body managed by {@link v2Message}. */
export type MessageV2EditOptions = Omit<MessageEditOptions, "components" | "content" | "embeds">;

/** Empty legacy-field values accepted while migrating a message to Components V2. */
export type MessageV2ResetFields = {
  readonly content?: null;
  readonly embeds?: readonly [];
  readonly stickers?: readonly [];
};

/**
 * Edit options that explicitly clear legacy fields while enabling Components V2.
 * Discord requires these empty values when the edited message previously used them.
 */
export type MessageV2MigrationOptions = Omit<MessageEditOptions, "components" | "content" | "embeds"> & MessageV2ResetFields & (
  | { readonly content: null }
  | { readonly embeds: readonly [] }
  | { readonly stickers: readonly [] }
);

/** Universal reply/edit payload returned when no reply-only option is supplied. */
export type MessageV2EditReplyOptions = Omit<MessageV2EditOptions, "flags"> & {
  readonly components: readonly MessageV2Component[];
  readonly flags: number;
};

/** Edit payload that includes the explicit resets needed to migrate a legacy message. */
export type MessageV2MigrationReplyOptions = Omit<MessageV2MigrationOptions, "flags"> & {
  readonly components: readonly MessageV2Component[];
  readonly flags: number;
};

function isOptionsObject(value: MessageV2EditOptions | MessageV2MigrationOptions | MessageV2Options | MessageV2Child): value is MessageV2EditOptions | MessageV2MigrationOptions | MessageV2Options {
  return typeof value === "object" && value !== null && !isComponentInput(value);
}

/**
 * Creates an edit-compatible Discord Components V2 message payload.
 *
 * @param child - First string, action row, container, file, gallery, section, separator,
 * or text display as Discord.js data/builder or raw API data.
 * @param children - Additional supported top-level children.
 * @example
 * ```ts
 * await interaction.reply(v2Message(container("## Ready", actionRow(confirmButton))))
 * ```
 */
export function v2Message(child: MessageV2Child, ...children: MessageV2Child[]): MessageV2EditReplyOptions;
/**
 * Creates an edit payload that resets legacy fields while enabling Components V2.
 *
 * @param options - One or more explicit Discord reset values (`null` or an empty array).
 * @param child - First supported top-level child.
 * @param children - Additional supported top-level children.
 */
export function v2Message(options: MessageV2MigrationOptions, child: MessageV2Child, ...children: MessageV2Child[]): MessageV2MigrationReplyOptions;
/**
 * Creates an edit-compatible payload with message options.
 *
 * @param options - Edit-safe Discord.js message options.
 * @param child - First supported top-level child.
 * @param children - Additional supported top-level children.
 */
export function v2Message(options: MessageV2EditOptions, child: MessageV2Child, ...children: MessageV2Child[]): MessageV2EditReplyOptions;
/**
 * Creates a reply-only payload with options such as `ephemeral`, `tts`, or `files`.
 *
 * @param options - Discord.js interaction reply options excluding incompatible body fields.
 * @param child - First supported top-level child.
 * @param children - Additional supported top-level children.
 */
export function v2Message(options: MessageV2Options, child: MessageV2Child, ...children: MessageV2Child[]): MessageV2ReplyOptions;
export function v2Message(
  first: MessageV2EditOptions | MessageV2MigrationOptions | MessageV2Options | MessageV2Child,
  ...children: MessageV2Child[]
): MessageV2EditReplyOptions | MessageV2MigrationReplyOptions | MessageV2ReplyOptions {
  const options = isOptionsObject(first) ? first : {};
  const allChildren: readonly MessageV2Child[] = isOptionsObject(first) ? children : [first, ...children];
  const message = {
    ...options,
    flags: decodeMessageFlags(options.flags, rootContext("message.flags")) | DiscordMessageFlags.IsComponentsV2,
    components: allChildren,
  };
  return decodeV2Message(message, rootContext("message"));
}
