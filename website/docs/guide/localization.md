---
sidebar_position: 8
---

# Localization

Arcscord exposes translation helpers in command metadata and runtime contexts.

## Configure the locale manager

```ts
import { ArcClient } from "arcscord";
import en from "../locale/en.json";
import fr from "../locale/fr.json";

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

Arcscord maps Discord locales, for example `en-US`, to i18next languages, for example `en`.
If `languageMap`, `langDetector`, or `availableLanguages` are omitted, Arcscord applies its defaults.

```ts
import { createCommand } from "arcscord";

export const i18nCommand = createCommand({
  build: {
    slash: {
      name: "i18n",
      nameLocalizations: t => t("test:i18n.command.name"),
      description: "default description",
      descriptionLocalizations: t => t("test:i18n.command.description"),
    },
  },
  run: ctx => ctx.reply(ctx.t("test:i18n.command.run"), {
    ephemeral: true,
  }),
});
```

The same fixed translation function is available in command runs, autocomplete handlers, and component handlers through `ctx.t`. The detected i18next language is available as `ctx.locale`.

## Type translation keys

For strict translation keys, use i18next module augmentation. This keeps localization optional for projects that do not enable the locale manager, while projects using i18next get typed `ctx.t(...)` and `nameLocalizations: t => ...`.

```ts title="src/@types/i18next.d.ts"
import type en from "../../locale/en.json";

declare const resources: {
  readonly translations: typeof en;
};

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translations";
    resources: typeof resources;
  }
}
```

The `resources` declaration is type-only and keeps the keys tied to `typeof en` without requiring an extra runtime file.

## Localize Arcscord user messages

Messages sent by Arcscord itself, such as internal-error and missing-permission replies, can use the same locale context.

```ts
const client = new ArcClient(process.env.TOKEN ?? "", {
  intents: [],
  managers: {
    locale: {
      enabled: true,
      i18nOptions: {
        resources: {
          en: { translations: en },
        },
        defaultNS: "translations",
        fallbackLng: "en",
      },
    },
  },
  baseMessages: {
    error: (id, context) => ({
      content: context?.t?.("errors.internal", { id }) ?? `Internal error ${id}`,
    }),
    missingPermissions: (permissions, context) => ({
      content: context?.t?.("errors.missingPermissions", {
        permissions: permissions.join(", "),
      }) ?? `Missing permissions: ${permissions.join(", ")}`,
    }),
  },
});
```
