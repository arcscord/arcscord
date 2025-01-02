import * as process from "node:process";
import { ArcClient } from "arcscord";
import en from "../locale/en.json";
import handlers from "./_handlers";

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

client.loadEvents(handlers.events);
client.loadTasks(handlers.tasks);
client.loadComponents(handlers.components);
client.on("ready", async () => {
  void client.loadCommands(handlers.commands);
});

void client.login();
