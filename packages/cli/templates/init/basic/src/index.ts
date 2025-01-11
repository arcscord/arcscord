import * as process from "node:process";
import { ArcClient } from "arcscord";
import handlers from "./_handlers";
import "dotenv/config";

const client = new ArcClient(process.env.TOKEN ?? "", {
  intents: [],
});

client.loadHandlers(handlers);
client.on("ready", () => {
  client.logger.info("Ready !");
});

void client.login();
