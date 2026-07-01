---
sidebar_position: 4
---

# Subcommands

Subcommands are slash command actions grouped under a single top-level command. They are useful when several actions belong to the same feature area, such as `/moderation ban`, `/moderation kick`, and `/moderation timeout`.

Arcscord represents this with `createCommandWithSubs`. The top-level command owns the Discord command name and description. Each subcommand is created with `createSubCommand`: it has `name`, `description`, and optional `options` directly, without a nested `slash` field.

## When to use subcommands

Use subcommands when users should discover related actions from one command namespace.

- Use `/settings get` and `/settings set` when one feature has multiple operations.
- Avoid subcommands when the actions are unrelated or when one standalone command is clearer.

Discord subcommands are only available for slash commands. User and message context menu commands do not support subcommands.

## Basic subcommands

Each subcommand has its own handler. Arcscord resolves the selected subcommand and runs only that handler.

```ts
import { createCommandWithSubs, createSubCommand } from "arcscord";

const banCommand = createSubCommand({
  name: "ban",
  description: "Ban a member",
  options: {
    user: {
      type: "user",
      description: "Member to ban",
      required: true,
    },
    reason: {
      type: "string",
      description: "Reason shown in moderation logs",
    },
  },
  run: (ctx) => {
    const reason = ctx.options.reason || "No reason provided";

    return ctx.reply(
      `Banned ${ctx.options.user.username}. Reason: ${reason}`,
    );
  },
});

const kickCommand = createSubCommand({
  name: "kick",
  description: "Kick a member",
  options: {
    user: {
      type: "user",
      description: "Member to kick",
      required: true,
    },
  },
  run: ctx => ctx.reply(`Kicked ${ctx.options.user.username}`),
});

export const moderationCommand = createCommandWithSubs({
  name: "moderation",
  description: "Moderation tools",
  subCommands: [banCommand, kickCommand],
});
```

This registers one Discord command named `moderation`. Discord displays `ban` and `kick` as choices inside that command, and Arcscord keeps each handler separate.

## Subcommand options

Subcommand options are declared exactly like slash command options, but they belong to the subcommand definition.

```ts
const timeoutCommand = createSubCommand({
  name: "timeout",
  description: "Timeout a member",
  options: {
    user: {
      type: "user",
      description: "Member to timeout",
      required: true,
    },
    minutes: {
      type: "integer",
      description: "Timeout duration in minutes",
      required: true,
      min_value: 1,
      max_value: 10080,
    },
  },
  run: (ctx) => {
    return ctx.reply(
      `Timed out ${ctx.options.user.username} for ${ctx.options.minutes} minutes`,
    );
  },
});
```

Read [command options](./options.md) for the complete list of supported option types.

## Subcommand groups

Subcommand groups add one more level between the top-level command and the subcommand. Use them when a command has several domains inside it.

For example:

- `/member role add`
- `/member role remove`
- `/member note add`
- `/member note list`

```ts
import { createCommandWithSubs, createSubCommand } from "arcscord";

const addRoleCommand = createSubCommand({
  name: "add",
  description: "Add a role",
  options: {
    role: {
      type: "role",
      description: "Role to add",
      required: true,
    },
  },
  run: ctx => ctx.reply(`Added ${ctx.options.role.name}`),
});

const removeRoleCommand = createSubCommand({
  name: "remove",
  description: "Remove a role",
  options: {
    role: {
      type: "role",
      description: "Role to remove",
      required: true,
    },
  },
  run: ctx => ctx.reply(`Removed ${ctx.options.role.name}`),
});

export const memberCommand = createCommandWithSubs({
  name: "member",
  description: "Manage members",
  subCommandsGroups: {
    role: {
      description: "Manage member roles",
      subCommands: [addRoleCommand, removeRoleCommand],
    },
  },
});
```

## Mixing groups and direct subcommands

Discord supports direct subcommands and subcommand groups on the same top-level command, and Arcscord exposes both `subCommands` and `subCommandsGroups`.

```ts
export const memberCommand = createCommandWithSubs({
  name: "member",
  description: "Manage members",
  subCommands: [banCommand],
  subCommandsGroups: {
    role: {
      description: "Manage member roles",
      subCommands: [addRoleCommand, removeRoleCommand],
    },
  },
});
```

Keep this shape readable. If the command becomes hard to scan, split unrelated actions into separate top-level commands.

## Access control

Permissions, installation types, and contexts are configured on the top-level command created with `createCommandWithSubs`.

```ts
export const moderationCommand = createCommandWithSubs({
  name: "moderation",
  description: "Moderation tools",
  defaultMemberPermissions: ["ModerateMembers"],
  contexts: ["guild"],
  subCommands: [banCommand, kickCommand],
});
```

Read [permissions and contexts](./permissions-contexts.md) for the complete explanation.
