import type {
  ActionRowData,
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
} from "discord.js";
import type { MessageActionRow } from "./action-row";
import type { ContainerChild, ContainerComponentInput } from "./container";
import { MessageFlags as DiscordMessageFlags } from "discord-api-types/v10";
import { MessageFlagsBitField } from "discord.js";
import { normalizeMessageChild } from "./internal/normalize-component";
import { isComponentInput } from "./internal/serialize";

/** Any top-level child accepted by {@link v2Message}. */
export type MessageV2Child = ContainerChild | ContainerComponentInput;

/** Resolved component data emitted by {@link v2Message}. */
export type MessageV2Component
  = | MessageActionRow
    | ActionRowData<ButtonComponentData>
    | ContainerComponentData
    | FileComponentData
    | MediaGalleryComponentData
    | SectionComponentData
    | SeparatorComponentData
    | TextDisplayComponentData;

/** Reply options excluding fields Discord forbids on Components V2 messages. */
export type MessageV2Options = Omit<InteractionReplyOptions, "components" | "content" | "embeds" | "poll" | "stickers">;

/** Reply payload returned when reply-only options are supplied. */
export type MessageV2ReplyOptions = MessageV2Options & {
  readonly components: readonly MessageV2Component[];
};

/** Edit-compatible options excluding the body managed by {@link v2Message}. */
export type MessageV2EditOptions = Omit<MessageEditOptions, "components" | "content" | "embeds">;

/** Universal reply/edit payload returned when no reply-only option is supplied. */
export type MessageV2EditReplyOptions = Omit<MessageV2EditOptions, "flags"> & {
  readonly components: readonly MessageV2Component[];
  readonly flags?: MessageFlags.IsComponentsV2 | MessageFlags.SuppressEmbeds;
};

function isOptionsObject(value: unknown): value is Record<string, unknown> {
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
  first: MessageV2EditOptions | MessageV2Options | MessageV2Child,
  ...children: MessageV2Child[]
): MessageV2EditReplyOptions | MessageV2ReplyOptions {
  const options = isOptionsObject(first) ? first as MessageV2EditOptions : {};
  const allChildren = isOptionsObject(first) ? children : [first as MessageV2Child, ...children];
  return {
    ...options,
    flags: ((options.flags === undefined
      ? 0
      : MessageFlagsBitField.resolve(options.flags as Parameters<typeof MessageFlagsBitField.resolve>[0]))
    | DiscordMessageFlags.IsComponentsV2) as MessageV2EditReplyOptions["flags"],
    components: allChildren.map(normalizeMessageChild),
  };
}
