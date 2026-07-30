/**
 * Bot entry point.
 *
 * Creates the {@link ArcClient}, loads the reminder command, starts the small
 * SQLite-backed scheduler, then connects to Discord.
 */
import { ArcClient } from "arcscord";
import handlers from "./handlers";
import { startReminderScheduler } from "./reminders/scheduler";
import { readHostEnv, readPortEnv, readRequiredEnv } from "./utils/env";
import { startWebhookServer } from "./webhooks/server";

const client = new ArcClient(readRequiredEnv("TOKEN"), {
  // Slash commands and outgoing DMs do not need gateway intents.
  intents: [],
});
const publicKey = readRequiredEnv("DISCORD_PUBLIC_KEY");
const webhookHost = readHostEnv("WEBHOOK_HOST", "127.0.0.1");
const webhookPort = readPortEnv("WEBHOOK_PORT", 3000);

async function bootstrap(): Promise<void> {
  await client.loadHandlers(handlers);
  startReminderScheduler(client);
  await startWebhookServer(client, publicKey, {
    host: webhookHost,
    port: webhookPort,
  });
  client.logger.info("Ready !");
}

client.once("clientReady", () => {
  void bootstrap().catch((error) => {
    client.logger.fatalError(error, { source: "bootstrap" });
    client.destroy();
    process.exitCode = 1;
  });
});

void client.login();
