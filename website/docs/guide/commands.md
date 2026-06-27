---
sidebar_position: 3
---

# Commands

Commands are declared with `createCommand` and loaded with `ArcClient`. This page covers the minimum setup needed to create and register a command.

## Create a command

The most common command is a slash command. Its definition lives in `build.slash`, and its handler lives in `run`.

```ts
import { createCommand } from "arcscord";

export const pingCommand = createCommand({
  build: {
    slash: {
      name: "ping",
      description: "Check if the bot is available",
    },
  },
  run: ctx => ctx.reply("Pong!"),
});
```

## Register commands

Load commands after the client is ready:

```ts
await client.waitReady();
const [err] = await client.loadCommands([pingCommand]);

if (err) {
  client.logger.logError(err);
}
```

You can also register commands before the ready event by passing your Discord application id to `ArcClient`.

```ts
import { ArcClient } from "arcscord";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  applicationId: process.env.DISCORD_APPLICATION_ID!,
});

await client.loadCommands([pingCommand]);
await client.login(process.env.DISCORD_TOKEN!);
```

When `applicationId` is set, Arcscord can push commands through Discord's REST API before Discord.js hydrates `client.application`.

## Load with handlers

`loadHandlers` can load commands, components, and events together. If `applicationId` is configured, command loading does not wait for `clientReady`.

```ts
await client.loadHandlers({
  commands: [pingCommand],
  components: [confirmButton],
  events: [readyEvent],
}, true /* info logs */);
```

`loadHandlers` logs and forwards command registration errors through the client logger. Use `loadCommands` directly when you need to inspect the returned `Result`.

## Command types

Arcscord supports several Discord application command shapes:

- Slash commands — use `createCommand` with `build.slash`
- User context menu commands — use `createCommand` with `build.user`
- Message context menu commands — use `createCommand` with `build.message`
- Subcommands — use `buildCommandWithSubs`, **not** `createCommand`

For subcommands, each subcommand is created with `createCommand` using a flat `build` (no `slash` wrapper), and the group is assembled with `buildCommandWithSubs`:

```ts
import { buildCommandWithSubs, createCommand } from "arcscord";

const banSubCommand = createCommand({
  build: {
    name: "ban",          // no "slash" wrapper for subcommands
    description: "Ban a member",
  },
  run: ctx => ctx.reply("Banned!"),
});

export const modCommand = buildCommandWithSubs({
  name: "mod",
  description: "Moderation tools",
  subCommands: [banSubCommand],
});
```

## Detailed pages

- [Slash commands](./commands/slash)
- [Command options](./commands/options)
- [Autocomplete](./commands/autocomplete)
- [Context menu commands](./commands/context-menu)
- [Subcommands](./commands/subcommands)
- [Permissions and contexts](./commands/permissions-contexts)
- [Registration](./commands/registration)

## Pre-reply

Use `preReply` when a command may take longer than Discord's initial interaction response window.

```ts
export const reportCommand = createCommand({
  build: {
    slash: {
      name: "report",
      description: "Generate a report",
    },
  },
  preReply: "ephemeral",
  run: async (ctx) => {
    const report = await generateReport();
    await ctx.editReply(report);
    return true;
  },
});
```

`preReply: true` defers a public response. `preReply: "ephemeral"` defers a response visible only to the user who ran the command. Because the interaction is already deferred, use `ctx.editReply()` for the final response.

Use middleware for runtime checks such as bot permissions, member permissions, allowlists, or cooldowns.
