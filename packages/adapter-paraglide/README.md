# @arcscord/adapter-paraglide

Official Paraglide JS localization adapter for [Arcscord](https://arcscord.dev/). It consumes generated Paraglide modules and has no Paraglide runtime dependency of its own.

```sh
pnpm add arcscord @arcscord/adapter-paraglide
```

```ts
import { createParaglideAdapter } from "@arcscord/adapter-paraglide";
import { ArcClient } from "arcscord";
import * as messages from "./paraglide/messages.js";
import { baseLocale, locales } from "./paraglide/runtime.js";

const localization = createParaglideAdapter({
  messages,
  runtime: { baseLocale, locales },
});

const client = new ArcClient(token, {
  intents: ["Guilds"],
  localization: { adapter: localization },
});

const nameLocalizations = localization.discord(messages.commands_ping_name);
```

See the [localization guide](https://arcscord.dev/guide/localization#paraglide-js) and [API reference](https://arcscord.dev/api?package=adapter-paraglide).
