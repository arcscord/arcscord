/**
 * Bot entry point.
 *
 * Creates the {@link ArcClient} (a thin subclass of the discord.js `Client`),
 * configures its managers, then loads every handler and logs in.
 */
import * as process from "node:process";
import { ArcClient } from "arcscord";
import { GatewayIntentBits } from "discord.js";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import handlers from "./handlers";
import { commandResultHandler } from "./utils/command_result_handler";

const client = new ArcClient(process.env.TOKEN ?? "", {
  // Interactions (slash commands, buttons, modals) need no intents, but the
  // message-counting event does: `GuildMessages` delivers messageCreate (we only
  // read author + channel, so no privileged MessageContent), and `Guilds`
  // populates the channel/guild caches those handlers rely on.
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  managers: {
    // Locale manager: wraps i18next so `ctx.t(...)` resolves per interaction.
    locale: {
      i18nOptions: {
        // Each language maps to a JSON bundle in `locales/`. `en.json` is the
        // source of truth for the translation types (see types/i18next.d.ts).
        resources: {
          en: {
            translations: en,
          },
          fr: {
            translations: fr,
          },
        },
        defaultNS: "translations",
        // Language used when the user's locale has no matching translation.
        fallbackLng: "en",
        // Enables the typed `t($ => $.a.b)` selector syntax used across the bot.
        enableSelector: "optimize",
      },
      enabled: true,
      // Serves the "en" bundle for these Discord locales.
      languageMap: {
        en: ["en-US", "en-GB"],
      },
      // Discord locales the command name/description localizations are built for.
      availableLanguages: ["en-US", "en-GB"],
    },
    // Command manager: swap the default result handler for our own, which also
    // records command usage. See utils/command_result_handler.ts.
    command: {
      resultHandler: commandResultHandler,
    },
  },
  // Optional. When set, application (slash) commands can be registered over REST
  // without waiting for the gateway — so `loadHandlers` can run before `login()`
  // (and before `clientReady`). Without it, you must load handlers after ready,
  // once the application id is known.
  applicationId: process.env.APPLICATION_ID,
});

// `clientReady` only logs here; handlers are already loaded below.
client.on("clientReady", () => {
  client.logger.info("Ready !");
});

// Load handlers (registering commands with Discord) before logging in, then
// connect to the gateway.
void (async () => {
  await client.loadHandlers(handlers);
  await client.login();
})();
