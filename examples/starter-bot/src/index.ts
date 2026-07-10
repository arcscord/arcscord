import * as process from "node:process";
import { ArcClient } from "arcscord";
import handlers from "./handlers";

const client = new ArcClient(process.env.TOKEN ?? "", {
  intents: [
    "GuildMessages",
    "MessageContent",
  ],
});

client.on("clientReady", async () => {
  await client.loadHandlers(handlers);
  client.logger.info("Ready !");
});

void client.login();
