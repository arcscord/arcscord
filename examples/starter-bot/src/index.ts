/**
 * Bot entry point.
 *
 * Creates the {@link ArcClient}, then loads every handler and logs a ready line
 * once Discord reports the client is connected.
 */
import * as process from "node:process";
import { ArcClient } from "arcscord";
import handlers from "./handlers";

const client = new ArcClient(process.env.TOKEN ?? "", {
  // Intents needed by src/events/react_to_arcscord.ts: `Guilds` for guild
  // context, `GuildMessages` to receive messageCreate, and `MessageContent` (a
  // privileged intent) to read the message text the listener matches on.
  intents: [
    "Guilds",
    "GuildMessages",
    "MessageContent",
  ],
});

client.on("clientReady", async () => {
  // Registers the commands from ./handlers with Discord, then wires the
  // components and events.
  await client.loadHandlers(handlers);
  client.logger.info("Ready !");
});

void client.login();
