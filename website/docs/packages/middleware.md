---
sidebar_position: 3
---

# @arcscord/middleware

`@arcscord/middleware` provides ready-to-use middleware classes for Arcscord commands and components.

This package does not define the middleware system itself. The core middleware API, execution flow, `next`, `cancel`, `error`, and custom middleware examples are documented in the [middleware guide](/guide/middleware).

## Install

```bash
pnpm add @arcscord/middleware
```

If your project does not already depend on Arcscord, install it too:

```bash
pnpm add arcscord @arcscord/middleware
```

## Exports

```ts
import {
  AuthorOnlyMiddleware,
  ComponentPermissionMiddleware,
  CommandUserAllowListMiddleware,
  ComponentUserAllowListMiddleware,
  CooldownMiddleware,
} from "@arcscord/middleware";
```

## CooldownMiddleware

`CooldownMiddleware` prevents a user from running a command again before a configured duration expires.

```ts
import { CooldownMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

export const pingCommand = createCommand({
  build: {
    slash: {
      name: "ping",
      description: "Ping with cooldown",
    },
  },
  use: [
    new CooldownMiddleware(10, ({ cooldownRemaining }) => ({
      content: `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds.`,
    })),
  ],
  run: ctx => ctx.reply("Pong!"),
});
```

Constructor:

```ts
new CooldownMiddleware(duration, message, autoClear);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `duration` | `number` | Cooldown duration in seconds. |
| `message` | `(options) => BaseMessageOptions` | Message returned when the user is still on cooldown. |
| `autoClear` | `false \| number` | Optional cleanup interval in seconds. Defaults to `3600`. Use `false` to disable automatic cleanup. |

The message callback receives:

| Field | Description |
| --- | --- |
| `user` | The Discord user affected by the cooldown. |
| `cooldownDuration` | The configured duration in seconds. |
| `cooldownRemaining` | Remaining time in milliseconds. |
| `cooldownEnd` | Date when the cooldown expires. |
| `commandName` | Name of the command that triggered the cooldown. |

### Behavior

- The cooldown is tracked per user.
- When the user is still on cooldown, the middleware replies or edits the deferred reply and cancels the command.
- When the cooldown has expired, the middleware stores the new cooldown end time and continues with `next({})`.
- If `autoClear` is enabled, expired user entries are removed periodically.

## CommandUserAllowListMiddleware

`CommandUserAllowListMiddleware` restricts a command to a fixed list of Discord user IDs.

```ts
import { CommandUserAllowListMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

const developerIds = ["123456789"];

export const debugCommand = createCommand({
  build: {
    slash: {
      name: "debug",
      description: "Developer debug command",
    },
  },
  use: [
    new CommandUserAllowListMiddleware(developerIds, {
      content: "This command is reserved for bot developers.",
    }),
  ],
  run: ctx => ctx.reply("Debug command accepted."),
});
```

Constructor:

```ts
new CommandUserAllowListMiddleware(userIds, message);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `userIds` | `Iterable<string>` | Discord user IDs allowed to run the command. Empty strings are ignored and IDs are trimmed. |
| `message` | `BaseMessageOptions` | Message returned when the current user is not allowed. |

### Behavior

- If `ctx.user.id` is in the allowlist, the middleware continues with `next({ allowed: true })`.
- If the user is not allowed, the middleware replies or edits the deferred reply and cancels the command.
- This middleware replaces the former core `developerCommand` option.

## AuthorOnlyMiddleware

`AuthorOnlyMiddleware` restricts a message component to the user who created the original interaction.

```ts
import { AuthorOnlyMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";

export const authorButton = createButton({
  route: "author_button",
  build: id => buildClickableButton({
    customId: id(),
    label: "Only me",
    style: "primary",
  }),
  use: [
    new AuthorOnlyMiddleware({
      content: "Only the original author can use this component.",
    }),
  ],
  run: ctx => ctx.reply("Accepted."),
});
```

Constructor:

```ts
new AuthorOnlyMiddleware(message);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `message` | `BaseMessageOptions` | Message returned when another user tries to use the component. |

`AuthorOnlyMiddleware` returns one of these `next` values:

| Status | Meaning |
| --- | --- |
| `"author"` | The current user is the original interaction author. |
| `"ignore"` | The middleware could not detect an original interaction author, so it did not block the component. |

### Behavior

- If the context is not a message component context, the middleware continues with `status: "ignore"`.
- If the message does not include interaction metadata, the middleware continues with `status: "ignore"`.
- If the current user is not the original interaction author, the middleware replies or edits the deferred reply and cancels the component handler.
- If the current user is the original author, the middleware continues with `status: "author"`.

## ComponentUserAllowListMiddleware

`ComponentUserAllowListMiddleware` restricts a component to a fixed list of Discord user IDs.

```ts
import { ComponentUserAllowListMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";

const moderatorIds = ["123456789"];

export const moderationButton = createButton({
  route: "moderation_button",
  build: id => buildClickableButton({
    customId: id(),
    label: "Moderate",
    style: "danger",
  }),
  use: [
    new ComponentUserAllowListMiddleware(moderatorIds, {
      content: "You cannot use this component.",
    }),
  ],
  run: ctx => ctx.reply("Moderation action accepted."),
});
```

Constructor:

```ts
new ComponentUserAllowListMiddleware(userIds, message);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `userIds` | `Iterable<string>` | Discord user IDs allowed to run the component. Empty strings are ignored and IDs are trimmed. |
| `message` | `BaseMessageOptions` | Message returned when the current user is not allowed. |

### Behavior

- If `ctx.user.id` is in the allowlist, the middleware continues with `next({ allowed: true })`.
- If the user is not allowed, the middleware replies or edits the deferred reply and cancels the component handler.

## ComponentPermissionMiddleware

`ComponentPermissionMiddleware` restricts a component to members with every required Discord permission.

```ts
import { ComponentPermissionMiddleware } from "@arcscord/middleware";
import { buildClickableButton, createButton } from "arcscord";

export const deleteMessageButton = createButton({
  route: "delete_message",
  build: id => buildClickableButton({
    customId: id(),
    label: "Delete",
    style: "danger",
  }),
  use: [
    new ComponentPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `Missing permissions: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply("Message deleted."),
});
```

Constructor:

```ts
new ComponentPermissionMiddleware(permissions, message);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `permissions` | `Iterable<PermissionsString>` | Required Discord permissions. Duplicate entries are ignored. |
| `message` | `(options) => BaseMessageOptions` | Message returned when the current member is missing permissions. |

The message callback receives:

| Field | Description |
| --- | --- |
| `missingPermissions` | Required permissions the current member does not have. |
| `permissions` | Full required permissions list. |
| `user` | The Discord user who triggered the component. |

### Behavior

- If the member has every required permission, the middleware continues with `next({ allowed: true })`.
- If the member is missing at least one permission, the middleware replies or edits the deferred reply and cancels the component handler.
- If the component is used without a guild member, every configured permission is treated as missing.

## Combining With Custom Middleware

Package middlewares can be mixed with your own middleware in the same `use` array.

```ts
use: [
  new CooldownMiddleware(10, () => ({
    content: "Slow down.",
  })),
  new MyCustomMiddleware(),
];
```

Middlewares run in array order. See the [middleware guide](/guide/middleware) for the full execution model.
