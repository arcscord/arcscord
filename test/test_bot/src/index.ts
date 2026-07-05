import process from "node:process";
import { ArcClient } from "arcscord";
import { Partials } from "discord.js";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import handlers from "./handlers";

const client = new ArcClient(process.env.TOKEN as string, {
  intents: [
    "Guilds",
    "GuildMembers",
    "GuildMessageReactions",
    "DirectMessageReactions",
    "MessageContent",
    "GuildMessages",
  ],
  partials: [Partials.Reaction, Partials.Message, Partials.User],
  enableInternalTrace: true,
  managers: {
    locale: {
      i18nOptions: {
        resources: {
          en: { test: en },
          fr: { test: fr },
        },
        defaultNS: "test",
        enableSelector: "optimize",
      },
      enabled: true,
    },
    command: {
      registration: {
        global: {
          commands: "put",
        },
      },
    },
  },
  applicationId: process.env.APPLICATION_ID as string,
});

client.loadHandlers(handlers);

client.on("clientReady", async () => {
  client.logger.info(`The client is ready!`);
});

void client.login();
