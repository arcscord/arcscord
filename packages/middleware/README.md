# @arcscord/middleware

[![npm version](https://badge.fury.io/js/@arcscord%2Fmiddleware.svg)](https://www.npmjs.com/package/@arcscord/middleware)
[![Discord Shield](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

## About

Reusable middleware for [Arcscord](https://www.npmjs.com/package/arcscord) command and component handlers.

This package provides common guards for cooldowns, user allowlists, component authors, and Discord permissions. Middleware can cancel the handler with a Discord response or continue and expose typed data through `ctx.additional`.

## Install

```sh
pnpm add @arcscord/middleware
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

## Component Middleware

### AuthorOnlyMiddleware

Restricts a message component to the user who created the original interaction.

```ts
import { AuthorOnlyMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";

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
  run: ctx => ctx.reply("Confirmed.", { ephemeral: true }),
});
```

When the original interaction author cannot be detected, this middleware continues with `ctx.additional.authorOnly.status` set to `"ignore"`.

### ComponentPermissionMiddleware

Restricts a component handler to members that have every required Discord permission.

```ts
import { ComponentPermissionMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";

export const moderateButton = createButton({
  route: "moderate",
  build: id => buildClickableButton({
    customId: id(),
    label: "Moderate",
    style: "red",
  }),
  use: [
    new ComponentPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `Missing permissions: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply(`Allowed: ${ctx.additional.componentPermission.allowed}`, {
    ephemeral: true,
  }),
});
```

### ComponentUserAllowListMiddleware

Restricts a component handler to a fixed list of Discord user IDs.

```ts
import { ComponentUserAllowListMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";

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
    ephemeral: true,
  }),
});
```

## Exports

```ts
import type { MessageOptions } from "@arcscord/middleware";
import {
  AuthorOnlyMiddleware,
  CommandUserAllowListMiddleware,
  ComponentPermissionMiddleware,
  ComponentUserAllowListMiddleware,
  CooldownMiddleware

} from "@arcscord/middleware";
```

## Notes

- Middleware names must be unique in a single `use` array.
- Static messages use Discord.js `BaseMessageOptions`.
- Callback messages receive middleware-specific data and return `BaseMessageOptions`.
- User IDs passed to allowlist middleware are trimmed, and empty values are ignored.

## License

MIT
