import { createSubCommand } from "arcscord";
import { listReminders } from "#/reminders/database";
import { formatDiscordTimestamp } from "#/reminders/duration";
import { reminderReply } from "#/utils/reply";

/**
 * `/reminder list` — shows only the reminders owned by the current user.
 */
export const listRemindersSubCommand = createSubCommand({
  name: "list",
  description: "List your pending reminders.",
  run: (ctx) => {
    const reminders = listReminders(ctx.user.id);
    if (reminders.length === 0) {
      return ctx.reply(reminderReply(
        {
          tone: "info",
          title: "No pending reminders",
        },
        "Create one with `/reminder create`.",
      ));
    }

    const lines = reminders.map((reminder) => {
      const message = reminder.message.length > 80
        ? `${reminder.message.slice(0, 77)}...`
        : reminder.message;

      return `- \`#${reminder.id}\` - ${formatDiscordTimestamp(reminder.remindAt)}\n  ${message}`;
    });

    return ctx.reply(reminderReply(
      {
        tone: "info",
        title: "Pending reminders",
      },
      lines.join("\n"),
    ));
  },
});
