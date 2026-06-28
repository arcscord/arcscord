import * as process from "node:process";
import { ArcClient } from "arcscord";
import en from "../locale/en.json";
import handlers from "./handlers";
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
        fallbackLng: "en",
        enableSelector: "optimize",
      },
      enabled: true,
      languageMap: {
        en: ["en-US", "en-GB"],
      },
      availableLanguages: ["en-US", "en-GB"],
    },
  },
});

client.on("clientReady", async () => {
  await client.loadHandlers(handlers);
  client.logger.info("Ready !");
});

void client.login();
