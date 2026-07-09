import { createSubCommand } from "arcscord";
import { deleteReminder } from "#/reminders/database";
import { reminderReply } from "#/utils/reply";

/**
 * `/reminder delete` — removes one reminder by id, scoped to the current user.
 *
 * The SQL delete checks both `user_id` and `id`, so users cannot delete someone
 * else's reminder by guessing an id.
 */
export const deleteReminderSubCommand = createSubCommand({
  name: "delete",
  description: "Delete one of your reminders.",
  options: {
    id: {
      type: "integer",
      description: "Reminder id shown by /reminder list.",
      required: true,
      min_value: 1,
    },
  },
  run: (ctx) => {
    const deleted = deleteReminder(ctx.user.id, ctx.options.id);
    if (!deleted) {
      return ctx.reply(reminderReply(
        {
          tone: "error",
          title: "Reminder not found",
        },
        `No pending reminder found with id \`#${ctx.options.id}\`.`,
      ));
    }

    return ctx.reply(reminderReply(
      {
        tone: "success",
        title: "Reminder deleted",
      },
      `Reminder \`#${ctx.options.id}\` was removed.`,
    ));
  },
});
