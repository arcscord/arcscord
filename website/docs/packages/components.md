---
sidebar_position: 2
---

# @arcscord/components

Arcscord includes typed helpers for Discord Components V2 messages and re-exports them from its main `arcscord` entry point. The same API is published separately as `@arcscord/components` for Discord.js projects that do not need the framework.

- [API reference](/api?package=components)
- [npm package](https://www.npmjs.com/package/@arcscord/components)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/components)

## Using Components V2 with Arcscord

Install Arcscord normally; `@arcscord/components` is already included as a dependency and does not need to be installed separately:

```sh
pnpm add arcscord discord.js
```

```ts
import {
  accessory,
  actionRow,
  button,
  container,
  section,
  separator,
  thumbnail,
  v2Message,
} from "arcscord";

await ctx.reply(v2Message(
  container(
    { accentColor: 0x5865F2 },
    "## Support",
    section(
      "Open a support request.",
      accessory(thumbnail({ media: { url: "https://example.com/support.png" } })),
    ),
    separator({ divider: true, spacing: "large" }),
    actionRow(button({
      customId: "support",
      label: "Open",
      style: "primary",
    })),
  ),
));
```

## Standalone usage with Discord.js

Install the dedicated package when using the helpers without Arcscord:

```sh
pnpm add @arcscord/components discord.js
```

```ts
import { ButtonBuilder, ButtonStyle } from "discord.js";
import {
  accessory,
  actionRow,
  container,
  section,
  separator,
  thumbnail,
  v2Message,
} from "@arcscord/components";

await interaction.reply(v2Message(
  container(
    { accentColor: 0x5865F2 },
    "## Support",
    section(
      "Open a support request.",
      accessory(thumbnail({ media: { url: "https://example.com/support.png" } })),
    ),
    separator({ divider: true, spacing: "large" }),
    actionRow(
      new ButtonBuilder()
        .setCustomId("support")
        .setLabel("Open")
        .setStyle(ButtonStyle.Primary),
    ),
  ),
));
```

No Arcscord client, context, manager, or error package is required in this standalone example. `v2Message` enables `MessageFlags.IsComponentsV2` and returns a payload accepted directly by Discord.js reply and edit methods.

## Input interoperability

Every valid nesting point accepts Discord.js component data, official Discord.js builders, and raw `API*Component` objects from `discord-api-types`. Strings are shorthand for text displays. The package recursively converts builders and snake_case API objects into the same camelCase Discord.js component data returned by the simple helpers.

`actionRow` follows Discord's message-row constraints: pass one to five buttons, or exactly one string, user, role, mentionable, or channel select menu. Each component may be Discord.js data, an official builder, or a raw API object.

For the full option tables, nesting rules, and examples, see the [Components V2 guide](/guide/components/components-v2).

## Identical API surface

The `arcscord` package re-exports the same helpers and compatibility type names. Switching between `arcscord` and `@arcscord/components` only requires changing the import source for APIs provided by this package.
