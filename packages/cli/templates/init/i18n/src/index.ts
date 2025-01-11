import * as process from "node:process";
import { ArcClient } from "arcscord";
import en from "../locale/en.json";
import handlers from "./_handlers";
import "dotenv/config";

const client = new ArcClient(process.env.TOKEN ?? "", {
  intents: [],
  managers: {
    locale: {
      i18nOptions: {
        resources: {
          en: {
            translations: en,
          },
        },
        defaultNS: "translations",
      },
      enabled: true,
    },
  },
});

client.loadHandlers(handlers);

client.on("ready", () => {
  client.logger.info("Ready !");
});

void client.login();
