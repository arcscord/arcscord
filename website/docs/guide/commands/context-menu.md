---
sidebar_position: 2
---

# Context menu commands

Context menu commands appear in Discord's right-click menus. Arcscord supports user commands and message commands.

## User commands

User commands receive a `UserCommandContext`. The selected user is available as `ctx.targetUser`.

```ts
import { createCommand } from "arcscord";
import { MessageFlags } from "discord.js";

export const inspectUserCommand = createCommand({
  build: {
    user: {
      name: "Inspect user",
    },
  },
  run: ctx => ctx.reply(`Selected user: ${ctx.targetUser.username}`),
});
```

## Message commands

Message commands receive a `MessageCommandContext`. The selected message is available as `ctx.targetMessage`.

```ts
import { createCommand } from "arcscord";

export const quoteMessageCommand = createCommand({
  build: {
    message: {
      name: "Quote message",
    },
  },
  run: (ctx) => {
    return ctx.reply({
      content: `> ${ctx.targetMessage.content}`,
      flags: MessageFlags.Ephemeral,
    });
  },
});
```

## Mixed context command

One command can expose both context menu surfaces. Use the context flags to narrow the handler.

```ts
import { createCommand } from "arcscord";

export const inspectCommand = createCommand({
  build: {
    user: {
      name: "Inspect user",
    },
    message: {
      name: "Inspect message",
    },
  },
  run: (ctx) => {
    if (ctx.isUserCommand) {
      return ctx.reply(`Selected user: ${ctx.targetUser.username}`);
    }

    return ctx.reply(`Selected message: ${ctx.targetMessage.id}`);
  },
});
```

## Access control

Context menu commands support the same permission, installation, and context fields as slash commands. Read [permissions and contexts](./permissions-contexts.md) for the complete explanation.
