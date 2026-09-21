import process from "node:process";
import { ArcClient } from "arcscord";
import { Partials } from "discord.js";
import handlers from "./handlers";
import { localization } from "./localization";

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
  localization: { adapter: localization },
  managers: {
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

client.on("clientReady", async () => {
  client.logger.info(`The client is ready!`);
});

async function start(): Promise<void> {
  try {
    await client.loadHandlers(handlers);
    await client.login();
  }
  catch (err) {
    client.logger.fatalError(err);
    process.exitCode = 1;
  }
}

void start();
