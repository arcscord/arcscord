---
sidebar_position: 5
---

# Permissions and contexts

Commands can restrict who can use them, where they can run, and where they can be installed. Arcscord exposes Discord's command access fields directly on slash, user, message, and top-level subcommand definitions.

Discord documents these fields in the [application command object](https://discord.com/developers/docs/interactions/application-commands#application-command-object) and interaction contexts in the [interaction context type documentation](https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object-interaction-context-types).

## Default member permissions

Use `defaultMemberPermissions` to tell Discord which guild permissions a member should have by default to use the command.

```ts
import { createCommand } from "arcscord";

export const pruneCommand = createCommand({
  build: {
    slash: {
      name: "prune",
      description: "Delete recent messages",
      defaultMemberPermissions: ["ManageMessages"],
      contexts: ["guild"],
    },
  },
  run: ctx => ctx.reply("Messages pruned"),
});
```

This is a Discord command permission default. Server admins can still adjust command permissions in Discord depending on their server configuration.

You can pass one permission or several permissions:

```ts
defaultMemberPermissions: "ManageMessages"
```

```ts
defaultMemberPermissions: ["ManageMessages", "ModerateMembers"]
```

The permission names are Discord.js permission strings.

## Contexts

Use `contexts` to control where Discord allows the command to be used.

| Context | Meaning |
| --- | --- |
| `guild` | The command can be used inside servers. |
| `botDm` | The command can be used in direct messages with the bot. |
| `privateChannel` | The command can be used in private channels supported by Discord application commands. |

```ts
export const dmCommand = createCommand({
  build: {
    slash: {
      name: "help",
      description: "Show help",
      contexts: ["guild", "botDm"],
    },
  },
  run: ctx => ctx.reply("Help message"),
});
```

If a command depends on guild-only data, such as roles, moderation permissions, or guild channels, restrict it to `["guild"]`.

## Integration types

Use `integrationTypes` to control where the command can be installed.

| Integration type | Meaning |
| --- | --- |
| `guildInstall` | The command is available for guild-installed applications. |
| `userInstall` | The command is available for user-installed applications. |

```ts
export const personalCommand = createCommand({
  build: {
    slash: {
      name: "bookmark",
      description: "Save a personal bookmark",
      integrationTypes: ["userInstall"],
      contexts: ["botDm", "privateChannel"],
    },
  },
  run: ctx => ctx.reply("Bookmark saved"),
});
```

## Context menu commands

User and message context menu commands use the same fields.

```ts
export const reportMessageCommand = createCommand({
  build: {
    message: {
      name: "Report message",
      defaultMemberPermissions: ["ManageMessages"],
      contexts: ["guild"],
      integrationTypes: ["guildInstall"],
    },
  },
  run: ctx => ctx.reply(`Reported message ${ctx.targetMessage.id}`),
});
```

## Subcommands

For commands built with `buildCommandWithSubs`, access control belongs on the top-level command. Individual subcommands do not define separate Discord command permissions.

```ts
import { buildCommandWithSubs } from "arcscord";

export const moderationCommand = buildCommandWithSubs({
  name: "moderation",
  description: "Moderation tools",
  defaultMemberPermissions: ["ModerateMembers"],
  contexts: ["guild"],
  integrationTypes: ["guildInstall"],
  subCommands: [banCommand, kickCommand],
});
```

Use middleware or handler checks when different subcommands need different runtime rules.

For bot permission checks performed at runtime, use `CommandBotPermissionMiddleware` from `@arcscord/middleware`.
