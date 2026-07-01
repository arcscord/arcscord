---
sidebar_position: 1
---

# Slash commands

Slash commands are declared in `slash`. Arcscord infers the handler context from the definition, so options declared in the builder are available on `ctx.options`.

## Basic command

```ts
import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";

export const pingCommand = createCommand({
  slash: {
    name: "ping",
    description: "Check if the bot is available",
  },
  run: ctx => ctx.reply("Pong!"),
});
```

## Options

Slash command options are declared in `slash.options`. The selected values are exposed on `ctx.options`.

```ts
import { createCommand } from "arcscord";

export const avatarCommand = createCommand({
  slash: {
    name: "avatar",
    description: "Show a Discord avatar",
    options: {
      user: {
        type: "user",
        description: "User to inspect",
      },
      size: {
        type: "number",
        description: "Image size",
        choices: [
          128,
          256,
          {
            name: "1024 (default)",
            value: 1024,
          },
        ],
      },
    },
  },
  run: (ctx) => {
    const user = ctx.options.user || ctx.user;
    const size = ctx.options.size || 1024;

    return ctx.reply({
      content: user.displayAvatarURL({ size }),
      flags: MessageFlags.Ephemeral,
    });
  },
});
```

For the complete option type list, constraints, choices, and autocomplete rules, read the [command options](./options.md) page.

## Required options

Use `required: true` when Discord should reject the command before it reaches your handler.

```ts
import { createCommand } from "arcscord";

export const sayCommand = createCommand({
  slash: {
    name: "say",
    description: "Send a message",
    options: {
      text: {
        type: "string",
        description: "Message content",
        required: true,
      },
    },
  },
  run: ctx => ctx.reply(ctx.options.text),
});
```

## Choices

String, integer, and number options can provide choices. Add `as const` to the array to narrow `ctx.options.color` to the exact literal union (`"red" | "green" | "blue"`) instead of plain `string`:

```ts
import { createCommand } from "arcscord";

export const colorCommand = createCommand({
  slash: {
    name: "color",
    description: "Pick a color",
    options: {
      color: {
        type: "string",
        description: "Color to select",
        required: true,
        choices: [
          "red",
          "green",
          {
            name: "Deep blue",
            value: "blue",
          },
        ] as const,
      },
    },
  },
  run: ctx => ctx.reply(`Selected ${ctx.options.color}`),
  // ctx.options.color is "red" | "green" | "blue"
});
```

## Access control

Slash commands can restrict default permissions, installation types, and execution contexts. Read [permissions and contexts](./permissions-contexts.md) for the complete explanation.
