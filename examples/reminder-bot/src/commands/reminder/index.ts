import { createCommandWithSubs } from "arcscord";
import { createReminderSubCommand } from "./create";
import { deleteReminderSubCommand } from "./delete";
import { listRemindersSubCommand } from "./list";

/**
 * `/reminder` groups every reminder action under one user-install command.
 *
 * `integrationTypes: ["userInstall"]` is the important Discord flag here: the
 * command is installed for the user, not for a guild. Contexts stay broad so the
 * user can run it from a server, a bot DM, or another private channel.
 */
export const reminderCommand = createCommandWithSubs({
  name: "reminder",
  description: "Create and manage personal DM reminders.",
  integrationTypes: ["userInstall"],
  contexts: ["guild", "botDm", "privateChannel"],
  subCommands: [
    createReminderSubCommand,
    listRemindersSubCommand,
    deleteReminderSubCommand,
  ],
});
