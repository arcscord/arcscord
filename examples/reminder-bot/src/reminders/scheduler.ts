import type { ArcClient } from "arcscord";
import { reminderDm } from "#/utils/reply";
import { deleteReminderById, listDueReminders } from "./database";
import { formatDiscordTimestamp } from "./duration";

const intervalMs = 30_000;

/**
 * Poll due reminders and send them by DM.
 *
 * This intentionally simple scheduler is enough for one local bot process. A
 * production bot would usually add job locking, retries and failure states.
 */
export function startReminderScheduler(client: ArcClient): NodeJS.Timeout {
  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }
    running = true;

    try {
      const reminders = listDueReminders(Date.now());
      for (const reminder of reminders) {
        try {
          const user = await client.users.fetch(reminder.userId);
          await user.send(reminderDm(
            "Reminder",
            reminder.message,
            `Scheduled for ${formatDiscordTimestamp(reminder.remindAt)}.`,
          ));
        }
        catch (err) {
          client.logger.error(`Failed to send reminder ${reminder.id}`, { error: err });
        }
        finally {
          // Keep the teaching example simple: after one delivery attempt, the
          // reminder is done, even if the user has closed their DMs.
          deleteReminderById(reminder.id);
        }
      }
    }
    finally {
      running = false;
    }
  };

  void tick();
  return setInterval(() => void tick(), intervalMs);
}
