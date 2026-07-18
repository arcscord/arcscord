# @arcscord/components

Standalone, typed helpers for building Discord Components V2 messages. The package depends only on Discord.js and `discord-api-types`; it does not require the Arcscord framework.

## Using the helpers through Arcscord

Arcscord re-exports the complete Components V2 API. An Arcscord bot can import the helpers from the framework without installing this package separately:

```ts
import { actionRow, container, text, v2Message } from "arcscord";

await ctx.reply(v2Message(
  container(
    text("## Ready"),
    actionRow(confirmButton.build()),
  ),
));
```

## Standalone installation

```sh
pnpm add @arcscord/components discord.js
```

## Standalone usage with Discord.js

```ts
import {
  accessory,
  actionRow,
  container,
  section,
  separator,
  thumbnail,
  v2Message,
} from "@arcscord/components";
import { ButtonBuilder, ButtonStyle } from "discord.js";

const payload = v2Message(
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
);
```

This example does not require an Arcscord client, context, manager, or error package. Pass the result to any compatible Discord.js reply or edit method. `v2Message` adds `MessageFlags.IsComponentsV2` automatically.

## Accepted inputs

Nested components accept:

- Discord.js `*ComponentData` objects;
- official Discord.js builders;
- raw `API*Component` objects from `discord-api-types`;
- strings wherever a text display is allowed.

Builders and raw API objects are recursively normalized to Discord.js camelCase component data. `actionRow` accepts either one to five buttons or exactly one string, user, role, mentionable, or channel select menu. Existing action rows can also be passed directly to `container` or `v2Message`.

## Nesting

| Parent | Allowed children |
| --- | --- |
| `v2Message` | text, action row, container, file, media gallery, section, separator |
| `container` | text, action row, file, media gallery, section, separator |
| `section` | one or more text displays followed by one `accessory(...)` |
| `accessory` | one button or thumbnail |
| `actionRow` | one to five buttons, or exactly one select menu |

For APIs exported by this package, standalone and Arcscord usage differ only by the import source: `@arcscord/components` or `arcscord`. Arcscord delegates those exports to this package.
