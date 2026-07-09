import type { MessageV2ReplyOptions } from "arcscord";
import { container, separator, v2Message } from "arcscord";
import { MessageFlags } from "discord.js";

type ReminderReplyTone = "error" | "info" | "success";

const accentColors = {
  error: 0xED4245,
  info: 0x5865F2,
  success: 0x57F287,
} satisfies Record<ReminderReplyTone, number>;

type ReminderReplyOptions = {
  details?: string;
  tone: ReminderReplyTone;
  title: string;
};

/**
 * Shared Components v2 response for reminder commands.
 */
export function reminderReply(
  options: ReminderReplyOptions,
  body: string,
): MessageV2ReplyOptions {
  const children = options.details
    ? [body, separator(), options.details] as const
    : [body] as const;

  return v2Message(
    {
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    },
    container(
      { accentColor: accentColors[options.tone] },
      `## ${options.title}`,
      ...children,
    ),
  );
}
