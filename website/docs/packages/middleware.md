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
