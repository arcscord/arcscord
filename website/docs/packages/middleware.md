---
sidebar_position: 3
description: Ready-to-use middleware classes for Arcscord commands and components.
---

# @arcscord/middleware

`@arcscord/middleware` provides ready-to-use middleware classes for Arcscord commands and components.

This package does not define the middleware system itself. The core middleware API, execution flow, `next`, `cancel`, `error`, and custom middleware examples are documented in the [middleware guide](/guide/middleware).

Links:

- [Documentation](https://arcscord.dev/)
- [API reference](/api?package=middleware)
- [npm package](https://www.npmjs.com/package/@arcscord/middleware)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/middleware)

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
  CommandBotPermissionMiddleware,
  ComponentBotPermissionMiddleware,
  ComponentMemberPermissionMiddleware,
  CommandUserAllowListMiddleware,
  ComponentUserAllowListMiddleware,
} from "@arcscord/middleware";
```

## Localized Reusable Messages

Middleware messages can be static Discord.js message objects or callbacks. A callback receives the middleware-specific data plus `ctx`, `locale`, and `t`, which lets you centralize localized messages instead of redefining them on every command.

```ts
import type { CommandBotPermissionMiddlewareMessageOptions, MessageOptions } from "@arcscord/middleware";
import type { CommandContext } from "arcscord";
import type { PermissionsString } from "discord.js";
import { CommandBotPermissionMiddleware } from "@arcscord/middleware";

const missingBotPermissionMessage: MessageOptions<CommandBotPermissionMiddlewareMessageOptions, CommandContext> = ({ missingPermissions, t }) => ({
  content: t($ => $.middleware.bot_missing_permissions, {
    permissions: missingPermissions.join(", "),
  }),
});

export const createBotPermissionMiddleware = (permissions: PermissionsString[]) => {
  return new CommandBotPermissionMiddleware(permissions, missingBotPermissionMessage);
};
```

Use the helper wherever you need the same behavior:

```ts
use: [
  createBotPermissionMiddleware(["ManageMessages"]),
];
```

## CommandUserAllowListMiddleware

`CommandUserAllowListMiddleware` restricts a command to a fixed list of Discord user IDs.

```ts
import { CommandUserAllowListMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

const developerIds = ["123456789"];

export const debugCommand = createCommand({
  slash: {
    name: "debug",
    description: "Developer debug command",
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
| `message` | `BaseMessageOptions \| (options) => BaseMessageOptions` | Message returned when the current user is not allowed. Callback messages receive `ctx`, `locale`, and `t`. |

### Behavior

- If `ctx.user.id` is in the allowlist, the middleware continues with `next({ allowed: true })`.
- If the user is not allowed, the middleware replies or edits the deferred reply and cancels the command.
- This middleware replaces the former core `developerCommand` option.

## CommandBotPermissionMiddleware

`CommandBotPermissionMiddleware` restricts a command to interactions where the bot has every required Discord permission.

```ts
import { CommandBotPermissionMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

export const pruneCommand = createCommand({
  slash: {
    name: "prune",
    description: "Delete recent messages",
    contexts: ["guild"],
  },
  use: [
    new CommandBotPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `I am missing: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply("Messages pruned."),
});
```

Constructor:

```ts
new CommandBotPermissionMiddleware(permissions, message);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `permissions` | `Iterable<PermissionsString>` | Discord permissions required by the bot. Duplicate entries are ignored. |
| `message` | `(options) => BaseMessageOptions` | Message returned when the bot is missing permissions. |

The message callback receives:

| Field | Description |
| --- | --- |
| `missingPermissions` | Required permissions the bot does not have. |
| `permissions` | Full required permissions list. |
| `user` | The Discord user who triggered the command. |
| `ctx` | Arcscord command context. |
| `locale` | Detected interaction locale. |
| `t` | Fixed translation function for the detected locale. |

### Behavior

- If the bot has every required permission, the middleware continues with `next({ allowed: true })`.
- If the bot is missing at least one permission, the middleware replies or edits the deferred reply and cancels the command handler.
- Outside guild interactions, the middleware continues without checking permissions.

## AuthorOnlyMiddleware

`AuthorOnlyMiddleware` restricts a message component to the user who created the original interaction.

```ts
import { AuthorOnlyMiddleware } from "@arcscord/middleware";
import { button, createButton } from "arcscord";

export const authorButton = createButton({
  route: "author_button",
  build: id => button({
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
| `message` | `BaseMessageOptions \| (options) => BaseMessageOptions` | Message returned when another user tries to use the component. Callback messages receive `ctx`, `locale`, and `t`. |

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
import { button, createButton } from "arcscord";

const moderatorIds = ["123456789"];

export const moderationButton = createButton({
  route: "moderation_button",
  build: id => button({
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
| `message` | `BaseMessageOptions \| (options) => BaseMessageOptions` | Message returned when the current user is not allowed. Callback messages receive `ctx`, `locale`, and `t`. |

### Behavior

- If `ctx.user.id` is in the allowlist, the middleware continues with `next({ allowed: true })`.
- If the user is not allowed, the middleware replies or edits the deferred reply and cancels the component handler.

## ComponentMemberPermissionMiddleware

`ComponentMemberPermissionMiddleware` restricts a component to members with every required Discord permission.

:::info
This middleware exists only for components. For commands, declare the required member permissions directly in the command definition (`slash.defaultMemberPermissions`) instead of using a middleware.
:::

```ts
import { ComponentMemberPermissionMiddleware } from "@arcscord/middleware";
import { button, createButton } from "arcscord";

export const deleteMessageButton = createButton({
  route: "delete_message",
  build: id => button({
    customId: id(),
    label: "Delete",
    style: "danger",
  }),
  use: [
    new ComponentMemberPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `Missing permissions: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply("Message deleted."),
});
```

Constructor:

```ts
new ComponentMemberPermissionMiddleware(permissions, message);
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
| `ctx` | Arcscord component context. |
| `locale` | Detected interaction locale. |
| `t` | Fixed translation function for the detected locale. |

### Behavior

- If the member has every required permission, the middleware continues with `next({ allowed: true })`.
- If the member is missing at least one permission, the middleware replies or edits the deferred reply and cancels the component handler.
- If the component is used without a guild member, every configured permission is treated as missing.

## ComponentBotPermissionMiddleware

`ComponentBotPermissionMiddleware` restricts a component to interactions where the bot has every required Discord permission.

```ts
import { ComponentBotPermissionMiddleware } from "@arcscord/middleware";
import { button, createButton } from "arcscord";

export const publishButton = createButton({
  route: "publish",
  build: id => button({
    customId: id(),
    label: "Publish",
    style: "primary",
  }),
  use: [
    new ComponentBotPermissionMiddleware(["SendMessages"], ({ missingPermissions }) => ({
      content: `I am missing: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply("Published."),
});
```

Constructor:

```ts
new ComponentBotPermissionMiddleware(permissions, message);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `permissions` | `Iterable<PermissionsString>` | Discord permissions required by the bot. Duplicate entries are ignored. |
| `message` | `(options) => BaseMessageOptions` | Message returned when the bot is missing permissions. |

The message callback receives:

| Field | Description |
| --- | --- |
| `missingPermissions` | Required permissions the bot does not have. |
| `permissions` | Full required permissions list. |
| `user` | The Discord user who triggered the component. |
| `ctx` | Arcscord component context. |
| `locale` | Detected interaction locale. |
| `t` | Fixed translation function for the detected locale. |

### Behavior

- If the bot has every required permission, the middleware continues with `next({ allowed: true })`.
- If the bot is missing at least one permission, the middleware replies or edits the deferred reply and cancels the component handler.
- Outside guild interactions, the middleware continues without checking permissions.

## Combining With Custom Middleware

Package middlewares can be mixed with your own middleware in the same `use` array.

```ts
use: [
  new CommandUserAllowListMiddleware(developerIds, {
    content: "This command is reserved for bot developers.",
  }),
  new MyCustomMiddleware(),
];
```

Middlewares run in array order. See the [middleware guide](/guide/middleware) for the full execution model.
