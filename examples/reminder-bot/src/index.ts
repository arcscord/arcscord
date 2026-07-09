/**
 * Bot entry point.
 *
 * Creates the {@link ArcClient}, loads the reminder command, starts the small
 * SQLite-backed scheduler, then connects to Discord.
 */
import { ArcClient } from "arcscord";
import handlers from "./handlers";
import { startReminderScheduler } from "./reminders/scheduler";
import { readRequiredEnv } from "./utils/env";

const client = new ArcClient(readRequiredEnv("TOKEN"), {
  // Slash commands and outgoing DMs do not need gateway intents.
  intents: [],
});

client.on("clientReady", async () => {
  await client.loadHandlers(handlers);
  startReminderScheduler(client);
  client.logger.info("Ready !");
});

void client.login();
