---
sidebar_position: 1
---

# Localization

Arcscord keeps only Discord-specific localization concerns in the core: locale detection,
mapping, fallback, adapter readiness, and command metadata transformation. Catalog loading,
translation syntax, and metadata selectors belong to adapter packages.

Official adapters are available for i18next and Paraglide JS, and the minimal public
adapter contract supports other libraries without imposing a shared selector syntax.

Localization applies to both interaction-time messages and registration-time command names, descriptions, subcommands, groups, options, and static choices.

## i18next

```sh
pnpm add @arcscord/adapter-i18next i18next
```

Create the adapter in a standalone module. Both the client bootstrap and handlers can
then import it without creating a circular dependency:

```ts title="src/localization.ts"
import { createI18nextAdapter } from "@arcscord/adapter-i18next";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

export const defaultNS = "translation";
export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

export const localization = createI18nextAdapter({
  options: {
    resources,
    defaultNS,
    fallbackLng: "en",
    enableSelector: "optimize",
  },
});
```

Enable i18next's native selector typing through its standard module augmentation:

```ts title="src/types/i18next.d.ts"
import "i18next";
import { defaultNS, resources } from "../localization";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    enableSelector: "optimize";
    resources: typeof resources.en;
  }
}
```

```ts title="src/index.ts"
import { ArcClient } from "arcscord";
import { localization } from "./localization";

export const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  localization: { adapter: localization },
});
```

Keep `localization.ts` independent from the client and handlers. In particular, do not
re-export the adapter from an entry point that also imports your commands.

At runtime, bind i18next to the context locale:

```ts
run: (ctx) => {
  const t = localization.getFixed(ctx);
  return ctx.reply(t($ => $.commands.ping.reply));
}
```

For command metadata, create a lazy definition. Arcscord resolves it after the adapter is ready:

```ts
slash: {
  name: "ping",
  nameLocalizations: localization.discord($ => $.commands.ping.name),
  description: "Replies with pong",
  descriptionLocalizations: localization.discord($ => $.commands.ping.description),
}
```

`discord(...)` follows i18next's native key or selector syntax, so no additional
`t => t(...)` wrapper is needed. Translation options can
be passed as the second argument, just like with `t(...)`.

Pass `instance` instead of `options` to use an already initialized i18next instance. Arcscord never mutates a supplied instance.

## Adapter initialization timeout

`client.loadCommands()` and `client.loadHandlers()` wait for `adapter.ready` before
transforming command metadata. By default, Arcscord waits for at most 30 seconds.
If the adapter is still pending, the operation rejects with
`LocalizationReadyTimeoutError` and the stable code `LOCALIZATION_READY_TIMEOUT`.

Configure a different duration in milliseconds when the adapter loads remote catalogs:

```ts
localization: {
  adapter: localization,
  readyTimeout: 10_000,
}
```

Set the option to `false` only when an unlimited startup wait is intentional:

```ts
localization: {
  adapter: localization,
  readyTimeout: false,
}
```

The timeout starts when command loading begins. It only limits adapter initialization:
it does not affect Discord's `client.waitReady()` timeout or runtime translation calls.
If `adapter.ready` rejects before the timeout, its original error is preserved.

## Paraglide JS

Compile Paraglide in the application, then pass its generated modules to the adapter. Arcscord does not run code generation at startup.

```sh
pnpm add @arcscord/adapter-paraglide
```

```ts title="src/localization.ts"
import { createParaglideAdapter } from "@arcscord/adapter-paraglide";
import * as messages from "./paraglide/messages.js";
import { baseLocale, locales } from "./paraglide/runtime.js";

export const localization = createParaglideAdapter({
  messages,
  runtime: { baseLocale, locales },
});
```

The returned messages surface keeps the generated Paraglide types and forces the interaction locale per call without changing Paraglide's global locale:

```ts
run: (ctx) => {
  const m = localization.getFixed(ctx);
  return ctx.reply(m.commands_ping_reply());
}

nameLocalizations: localization.discord(messages.commands_ping_name)
descriptionLocalizations: localization.discord(messages.commands_ping_description)
```

Metadata uses the generated message function directly, matching normal Paraglide usage.
When a metadata message has parameters, pass its input object as the second argument:

```ts
localization.discord(messages.command_for_user, { name: "user" })
```

## Detection and Discord mapping

By default Arcscord reads `interaction.locale`, then `guild.preferredLocale`. Detection and mapping remain library-independent:

```ts
localization: {
  adapter: localization,
  localeDetector: async ({ interaction, guild, user }) => {
    return await preferences.findLocale(user?.id)
      ?? interaction?.locale
      ?? guild?.preferredLocale;
  },
  languageMap: {
    en: ["en-US", "en-GB"],
    fr: "fr",
  },
  discordLocales: ["en-US", "en-GB", "fr"],
}
```

`ctx.locale` contains the mapped provider locale. Command metadata is only generated when the mapped locale exists in `adapter.locales`. A static Discord `LocaleMap` remains valid without an adapter.

## Custom adapters

Use `createLocalizationAdapter` for the runtime contract and
`createLocalizationDefinition` to expose metadata syntax native to your library:

```ts
import {
  createLocalizationAdapter,
  createLocalizationDefinition,
} from "arcscord";

const adapter = createLocalizationAdapter({
  defaultLocale: "en",
  locales: ["en", "fr"],
  ready: loadCatalogs(),
  getFixed: locale => ({
    message: (key: MessageKey) => catalogs[locale][key],
  }),
});

const discord = (key: MessageKey) => {
  return createLocalizationDefinition(
    adapter,
    locale => adapter.getFixed(locale).message(key),
  );
};

export const localization = Object.assign(adapter, {
  discord,
});
```

Arcscord never calls `discord`; it only consumes the opaque definition it returns. An
adapter may therefore accept a key, selector, generated function, object, or
any other provider-native typed input.

## Migrating from LocaleManager

The v1 i18next API remains operational, but is deprecated:

```ts
// Deprecated v1 configuration
new ArcClient(token, {
  managers: {
    locale: { enabled: true, i18nOptions },
  },
});

ctx.t($ => $.commands.ping.reply);
```

Migrate by creating `@arcscord/adapter-i18next`, moving the configuration to `localization.adapter`, and replacing `ctx.t(...)` with a locally bound translator:

```ts
const t = localization.getFixed(ctx);
t($ => $.commands.ping.reply);
```

`managers.locale`, `client.localeManager`, `LocaleManager`, `LocaleCallback`, and `ctx.t` will be removed in Arcscord v2. Configuring both the modern and legacy systems is rejected so the active locale source is never ambiguous.
