import process from "node:process";
import { ArcClient } from "arcscord";
import { Partials } from "discord.js";
import handlers from "./_handlers";
import en from "./locale/en.json";
import fr from "./locale/fr.json";
import "dotenv/config";

const client = new ArcClient(process.env.TOKEN as string, {
  intents: [
    "Guilds",
    "GuildMembers",
    "GuildMessageReactions",
    "DirectMessageReactions",
    "MessageContent",
  ],
  partials: [Partials.Reaction, Partials.Message, Partials.User],
  autoIntents: true,
  enableInternalTrace: true,
  managers: {
    locale: {
      i18nOptions: {
        resources: {
          en: { test: en },
          fr: { test: fr },
        },
        defaultNS: "test",
      },
      enabled: true,
    },
  },
});

client.loadHandlers(handlers);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

client.on("ready", async () => {
  await sleep(1000);
  const [err, count] = await client.commandManager.deleteUnloadedCommands();
  if (err) {
    return client.logger.fatalError(err);
  }
  client.logger.info(`Deleted ${count} unloaded commands`);
});

void client.login();
