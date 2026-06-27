---
sidebar_position: 1
---

# Localization

Arcscord integrates with [i18next](https://www.i18next.com/) to localize two different things:

- Discord application command metadata at build/registration time.
- Interaction responses at runtime for commands, autocomplete handlers, components, events, and Arcscord base messages.

Those two phases are intentionally different. Command names, descriptions, option names, option descriptions, subcommands, groups, and static choices are sent to Discord when commands are transformed and registered. Runtime handlers use the current interaction context and can call `ctx.t(...)` for the language detected for that interaction.

## Configure i18next

Enable the locale manager and provide either `i18nOptions` or `customI18n`.

```ts title="src/index.ts"
import { ArcClient } from "arcscord";
import en from "../locale/en.json";
import fr from "../locale/fr.json";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    locale: {
      enabled: true,
      i18nOptions: {
        resources: {
          en: { translations: en },
          fr: { translations: fr },
        },
        defaultNS: "translations",
        fallbackLng: "en",
        enableSelector: "optimize",
      },
    },
  },
});

// load your handlers here...

void client.login();
```

Arcscord passes `i18nOptions` directly to `i18next.init(...)`. See the i18next docs for [configuration options](https://www.i18next.com/overview/configuration-options), especially `resources`, `defaultNS`, `fallbackLng`, `supportedLngs`, `preload`, and `enableSelector`.

:::warning
If you pass `customI18n`, Arcscord does not call `init(...)` for you. The instance must already be initialized and all resources needed by command registration and runtime handlers must already be loaded.
:::

:::warning
For command metadata localization, every locale you expect to register must be loaded before commands are transformed. Arcscord skips a locale when the mapped i18next language has no loaded resource bundle for the configured namespace.
:::

## Discord locales and i18next languages

Discord uses locales such as `en-US`, `en-GB`, and `fr`. Your i18next resources usually use language keys such as `en` and `fr`. Arcscord maps Discord locales to i18next languages with `languageMap`.

```ts
const client = new ArcClient(process.env.TOKEN ?? "", {
  intents: [],
  managers: {
    locale: {
      enabled: true,
      i18nOptions: {
        resources: {
          en: { translations: en },
          fr: { translations: fr },
        },
        defaultNS: "translations",
        fallbackLng: "en",
        enableSelector: "optimize",
      },
      languageMap: {
        en: ["en-US", "en-GB"],
        fr: "fr",
      },
      availableLanguages: ["en-US", "en-GB", "fr"],
    },
  },
});
```

`languageMap` controls which i18next language is used for a detected Discord locale. `availableLanguages` controls which Discord locales Arcscord tries to include when it builds `nameLocalizations` and `descriptionLocalizations` for Discord.

## Type translation keys

Use i18next module augmentation if you want selector-style typed keys.

```ts title="src/@types/i18next.d.ts"
import type en from "../../locale/en.json";

declare const resources: {
  readonly translations: typeof en;
};

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translations";
    resources: typeof resources;
    enableSelector: "optimize";
  }
}
```

With `enableSelector: "optimize"`, you can write `t($ => $.commands.ping.name)` instead of string keys. See the i18next docs for [TypeScript selector support](https://www.i18next.com/overview/typescript) and the [enableSelector option](https://www.i18next.com/overview/configuration-options#others).

## When translations are called

Arcscord calls i18next in two places:

| Phase | What is translated | Which function is used |
| --- | --- | --- |
| Build/registration | Command names, descriptions, option metadata, group metadata, subcommand metadata, and static choice names | `i18n.getFixedT(mappedLanguage)` for every `availableLanguages` locale |
| Runtime | Command replies, autocomplete choices, component replies, events, middleware/base messages | `i18n.getFixedT(detectedLanguage)` on the context as `ctx.t` |

Build-time localization produces a Discord localization map such as `{ "en-US": "Ping", "fr": "Pinguer" }`. It is not recalculated per user after the command is registered. Runtime localization happens per interaction, after Arcscord runs `langDetector`.

:::warning
Discord command metadata has API limits. Slash command names, option names, subcommand names, and group names must remain valid Discord command identifiers and fit Discord length rules. Descriptions and localized descriptions also have Discord length rules. Localization cannot make a command name contain spaces, uppercase letters where Discord forbids them, or exceed Discord's maximum length.
:::

## Localized command example

```ts title="src/commands/i18n.ts"
import { createCommand } from "arcscord";

export const i18nCommand = createCommand({
  build: {
    slash: {
      name: "i18n",
      nameLocalizations: t => t($ => $.i18n.command.name),
      description: "Localized command example",
      descriptionLocalizations: t => t($ => $.i18n.command.description),
      options: {
        topic: {
          type: "string",
          description: "Topic",
          nameLocalizations: t => t($ => $.i18n.command.topicName),
          descriptionLocalizations: t => t($ => $.i18n.command.topicDescription),
          required: true,
        },
      },
    },
  },
  run: (ctx) => {
    return ctx.reply(ctx.t($ => $.i18n.command.run, {
      topic: ctx.options.topic,
    }));
  },
});
```

`nameLocalizations` and `descriptionLocalizations` are resolved when the command is registered. `ctx.t(...)` is resolved when the command runs.

## Localized autocomplete example

Autocomplete handlers run at interaction time. Use `ctx.t(...)` for choices that should match the focused user's detected language.

```ts
import { createCommand } from "arcscord";

export const searchCommand = createCommand({
  build: {
    slash: {
      name: "search",
      description: "Search with localized autocomplete",
      options: {
        category: {
          type: "string",
          description: "Category",
          nameLocalizations: t => t($ => $.search.category.name),
          descriptionLocalizations: t => t($ => $.search.category.description),
          autocomplete: true,
          required: true,
        },
      },
    },
  },
  run: ctx => ctx.reply(ctx.t($ => $.search.run, {
    category: ctx.options.category,
  })),
  autocomplete: {
    category: (ctx) => {
      return ctx.sendChoices([
        {
          name: ctx.t($ => $.search.category.choices.commands),
          value: "commands",
        },
        {
          name: ctx.t($ => $.search.category.choices.components),
          value: "components",
        },
      ]);
    },
  },
});
```

Autocomplete choice localization is runtime localization. It does not use the command registration localization map.

## Localized component example

Component handlers also receive `ctx.t(...)` and `ctx.locale`.

```ts
import { actionRow, button, createButton, createCommand } from "arcscord";
import { MessageFlags } from "discord.js";

export const languageButton = createButton({
  route: "language_button",
  build: id =>
    button({
      customId: id(),
      label: "i18n",
      style: "primary",
    }),
  run: (ctx) => {
    return ctx.reply(ctx.t($ => $.components.language.clicked), {
      flags: MessageFlags.Ephemeral,
    });
  },
});

export const componentCommand = createCommand({
  build: {
    slash: {
      name: "localized-component",
      description: "Send a localized component",
    },
  },
  run: (ctx) => {
    return ctx.reply({
      content: ctx.t($ => $.components.language.prompt),
      components: [actionRow(languageButton.build())],
      flags: MessageFlags.Ephemeral,
    });
  },
});
```

Component labels are part of the message payload you send at runtime. If the label itself must be translated, call `ctx.t(...)` before building or sending the component.

## Custom language detection

By default, Arcscord uses `interaction.locale` first and then `guild.preferredLocale`. Override `langDetector` when your bot stores a user or guild language preference elsewhere.

```ts
const client = new ArcClient(process.env.TOKEN ?? "", {
  intents: [],
  managers: {
    locale: {
      enabled: true,
      i18nOptions: {
        resources: {
          en: { translations: en },
          fr: { translations: fr },
        },
        defaultNS: "translations",
        fallbackLng: "en",
        enableSelector: "optimize",
      },
      langDetector: async ({ interaction, guild, user }) => {
        const stored = user
          ? await userLanguageRepository.find(user.id)
          : undefined;

        return stored
          ?? interaction?.locale
          ?? guild?.preferredLocale
          ?? "en-US";
      },
    },
  },
});
```

`langDetector` returns a Discord locale or an i18next language key. Arcscord then runs `mapLanguage(...)` so `en-US` can become `en`. If `langDetector` throws or returns nothing, Arcscord falls back to the configured i18next fallback language.

## Localize Arcscord base messages

Messages sent by Arcscord itself, such as internal-error replies, receive the same locale context.

```ts
const client = new ArcClient(process.env.TOKEN ?? "", {
  intents: [],
  managers: {
    locale: {
      enabled: true,
      i18nOptions: {
        resources: {
          en: { translations: en },
          fr: { translations: fr },
        },
        defaultNS: "translations",
        fallbackLng: "en",
        enableSelector: "optimize",
      },
    },
  },
  baseMessages: {
    error: (id, context) => ({
      content: context?.t?.($ => $.errors.internal, { id }) ?? `Internal error ${id}`,
    }),
  },
});
```

For more advanced loading strategies, backend plugins, and preload behavior, use the i18next docs for [resource loading](https://www.i18next.com/how-to/add-or-load-translations), [fallbacks](https://www.i18next.com/principles/fallback), and [`getFixedT`](https://www.i18next.com/overview/api#getfixedt).
