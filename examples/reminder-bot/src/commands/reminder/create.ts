import { createSubCommand } from "arcscord";
import { createReminder } from "#/reminders/database";
import { formatDiscordTimestamp, parseDelay } from "#/reminders/duration";
import { reminderReply } from "#/utils/reply";

/**
 * `/reminder create` — stores one personal reminder for the current user.
 *
 * It accepts relative delays (`10m`, `1h30m`, `2 hours`, `3 jours`) on purpose:
 * broad enough to feel natural, but still no time zone or calendar parsing.
 */
export const createReminderSubCommand = createSubCommand({
  name: "create",
  description: "Create a personal reminder.",
  options: {
    delay: {
      type: "string",
      description: "Delay before the reminder, for example 10m, 1h30m, 2 hours or 3 jours.",
      required: true,
      min_length: 2,
      max_length: 80,
    },
    message: {
      type: "string",
      description: "Text sent back to you in DM.",
      required: true,
      min_length: 1,
      max_length: 1000,
    },
  },
  run: (ctx) => {
    const delayMs = parseDelay(ctx.options.delay);
    if (!delayMs) {
      return ctx.reply(reminderReply(
        {
          tone: "error",
          title: "Invalid duration",
          details: "Examples: `10m`, `90min`, `1h30m`, `1 h 30 min`, `2 hours`, `3 jours`, `1d 4h 15m`.",
        },
        "Use a relative duration between 1 minute and 30 days.",
      ));
    }

    const remindAt = Date.now() + delayMs;
    const reminder = createReminder(ctx.user.id, ctx.options.message, remindAt);

    return ctx.reply(reminderReply(
      {
        tone: "success",
        title: "Reminder created",
        details: `Reminder id: \`#${reminder.id}\``,
      },
      `I will DM you ${formatDiscordTimestamp(reminder.remindAt)}.`,
    ));
  },
});
