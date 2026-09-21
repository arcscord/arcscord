# @arcscord/adapter-i18next

Official i18next localization adapter for [Arcscord](https://arcscord.dev/).

```sh
pnpm add arcscord @arcscord/adapter-i18next i18next
```

```ts
import { createI18nextAdapter } from "@arcscord/adapter-i18next";
import { ArcClient } from "arcscord";

const localization = createI18nextAdapter({
  options: {
    fallbackLng: "en",
    resources: {
      en: { translation: { greeting: "Hello" } },
      fr: { translation: { greeting: "Bonjour" } },
    },
  },
});

const client = new ArcClient(token, {
  intents: ["Guilds"],
  localization: { adapter: localization },
});
```

See the [localization guide](https://arcscord.dev/guide/localization#i18next) and [API reference](https://arcscord.dev/api?package=adapter-i18next).
