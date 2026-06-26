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

- slash commands
- user context menu commands
- message context menu commands
- slash commands with subcommands

Read the dedicated command pages for complete examples of each shape.
