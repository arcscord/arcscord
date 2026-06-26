# @arcscord/middleware

[![npm version](https://badge.fury.io/js/@arcscord%2Fmiddleware.svg)](https://www.npmjs.com/package/@arcscord/middleware)
[![Discord Shield](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

## About

Reusable middleware for [Arcscord](https://www.npmjs.com/package/arcscord) command and component handlers.

This package provides common guards for cooldowns, user allowlists, component authors, and Discord permissions. Middleware can cancel the handler with a Discord response or continue and expose typed data through `ctx.additional`.

Documentation: https://arcscord.github.io/arcscord/

## Install

```sh
pnpm add @arcscord/middleware
```

## Localized Reusable Messages

Every middleware message can be either a static `BaseMessageOptions` object or a callback. Message callbacks receive the middleware data plus `ctx`, `locale`, and `t`, so you can create one localized factory and reuse it instead of redefining the same message on every command.

```ts
import type { CooldownMessageOptions, MessageOptions } from "@arcscord/middleware";
import type { CommandContext } from "arcscord";
import { CooldownMiddleware } from "@arcscord/middleware";

const cooldownMessage: MessageOptions<CooldownMessageOptions, CommandContext> = ({ cooldownRemaining, t }) => ({
  content: t($ => $.middleware.cooldown, {
    seconds: Math.ceil(cooldownRemaining / 1000),
  }),
});

export function createCooldownMiddleware(duration: number) {
  return new CooldownMiddleware(duration, cooldownMessage);
}
```

Then reuse the factory wherever needed:

```ts
use: [
  createCooldownMiddleware(10),
];
```

## Command Middleware

### CooldownMiddleware

Prevents a user from running a command again before the configured duration expires.

```ts
import { CooldownMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

export const pingCommand = createCommand({
  build: {
    slash: {
      name: "ping",
      description: "Reply with pong.",
    },
  },
  use: [
    new CooldownMiddleware(10, ({ cooldownRemaining }) => ({
      content: `Wait ${Math.ceil(cooldownRemaining / 1000)}s before using this command again.`,
    })),
  ],
  run: ctx => ctx.reply("Pong!"),
});
```

The first argument is the cooldown duration in seconds. The optional third argument controls automatic cleanup of expired entries: pass a number of seconds, or `false` to disable it.

### CommandUserAllowListMiddleware

Restricts a command to a fixed list of Discord user IDs.

```ts
import { CommandUserAllowListMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

export const adminCommand = createCommand({
  build: {
    slash: {
      name: "admin",
      description: "Run an admin-only action.",
    },
  },
  use: [
    new CommandUserAllowListMiddleware(["123456789012345678"], {
      content: "You are not allowed to use this command.",
    }),
  ],
  run: (ctx) => {
    return ctx.reply(`Allowed: ${ctx.additional.userAllowList.allowed}`);
  },
});
```

### CommandBotPermissionMiddleware

Restricts a command to interactions where the bot has every required Discord permission.
Outside guild interactions, the middleware continues without checking permissions.

```ts
import { CommandBotPermissionMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

export const pruneCommand = createCommand({
  build: {
    slash: {
      name: "prune",
      description: "Delete recent messages.",
      contexts: ["guild"],
    },
  },
  use: [
    new CommandBotPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `I am missing: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply("Messages pruned."),
});
```

## Component Middleware

### AuthorOnlyMiddleware

Restricts a message component to the user who created the original interaction.

```ts
import { AuthorOnlyMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";
import { MessageFlags } from "discord.js";

export const confirmButton = createButton({
  route: "confirm",
  build: id => buildClickableButton({
    customId: id(),
    label: "Confirm",
    style: "green",
  }),
  use: [
    new AuthorOnlyMiddleware({
      content: "Only the original user can use this component.",
    }),
  ],
  run: ctx => ctx.reply("Confirmed.", { flags: MessageFlags.Ephemeral }),
});
```

When the original interaction author cannot be detected, this middleware continues with `ctx.additional.authorOnly.status` set to `"ignore"`.

### ComponentMemberPermissionMiddleware

Restricts a component handler to members that have every required Discord permission.

```ts
import { ComponentMemberPermissionMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";
import { MessageFlags } from "discord.js";

export const moderateButton = createButton({
  route: "moderate",
  build: id => buildClickableButton({
    customId: id(),
    label: "Moderate",
    style: "red",
  }),
  use: [
    new ComponentMemberPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `Missing permissions: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply(`Allowed: ${ctx.additional.componentMemberPermission.allowed}`, {
    flags: MessageFlags.Ephemeral,
  }),
});
```

`ComponentMemberPermissionMiddleware` checks permissions held by the member who triggered the component.

### ComponentBotPermissionMiddleware

Restricts a component to interactions where the bot has every required Discord permission.
Outside guild interactions, the middleware continues without checking permissions.

```ts
import { ComponentBotPermissionMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";
import { MessageFlags } from "discord.js";

export const publishButton = createButton({
  route: "publish",
  build: id => buildClickableButton({
    customId: id(),
    label: "Publish",
    style: "primary",
  }),
  use: [
    new ComponentBotPermissionMiddleware(["SendMessages"], ({ missingPermissions }) => ({
      content: `I am missing: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply("Published.", {
    flags: MessageFlags.Ephemeral,
  }),
});
```

### ComponentUserAllowListMiddleware

Restricts a component handler to a fixed list of Discord user IDs.

```ts
import { ComponentUserAllowListMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";
import { MessageFlags } from "discord.js";

export const privateButton = createButton({
  route: "private",
  build: id => buildClickableButton({
    customId: id(),
    label: "Private",
    style: "secondary",
  }),
  use: [
    new ComponentUserAllowListMiddleware(["123456789012345678"], {
      content: "You are not allowed to use this component.",
    }),
  ],
  run: ctx => ctx.reply(`Allowed: ${ctx.additional.userAllowList.allowed}`, {
    flags: MessageFlags.Ephemeral,
  }),
});
```

## Exports

```ts
import type { MessageOptions } from "@arcscord/middleware";
import {
  AuthorOnlyMiddleware,
  CommandBotPermissionMiddleware,
  CommandUserAllowListMiddleware,
  ComponentBotPermissionMiddleware,
  ComponentMemberPermissionMiddleware,
  ComponentUserAllowListMiddleware,
  CooldownMiddleware

} from "@arcscord/middleware";
```

`CommandBotPermissionMiddleware` and `ComponentBotPermissionMiddleware` check permissions held by the bot for the current interaction. `ComponentMemberPermissionMiddleware` checks permissions held by the member who triggered the component.

## Notes

- Middleware names must be unique in a single `use` array.
- Static messages use Discord.js `BaseMessageOptions`.
- Callback messages receive middleware-specific data, `ctx`, `locale`, and `t`, then return `BaseMessageOptions`.
- User IDs passed to allowlist middleware are trimmed, and empty values are ignored.

## License

MIT
