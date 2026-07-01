---
sidebar_position: 4
---

# Command registration

Arcscord registers Discord application commands with `client.loadCommands` or `client.loadHandlers`.
Discord documents the registration model in the [application command docs](https://discord.com/developers/docs/interactions/application-commands). Guild commands update quickly and are best for development; global commands are the production default but can take longer to propagate.

## Global commands

Register commands with `client.loadCommands`. Without extra options, Discord.js must know the current application, so load commands after the client is ready.

```ts
await client.waitReady();
const [err] = await client.loadCommands([pingCommand, avatarCommand]);

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

const [err] = await client.loadCommands([pingCommand, avatarCommand]);

if (err) {
  client.logger.logError(err);
}

await client.login(process.env.DISCORD_TOKEN!);
```

When `applicationId` is set, Arcscord can push commands through Discord's REST API before Discord.js hydrates `client.application`.

## Guild commands

Pass a guild id as the third argument to register guild-scoped commands. Guild commands update faster than global commands and are useful during development.

```ts
await client.loadCommands(
  [pingCommand],
  "development",
  process.env.DISCORD_GUILD_ID!,
);
```

## Loading handlers

`loadHandlers` can load events, components, and commands together. If `applicationId` is configured, command loading does not wait for `clientReady`.

```ts
await client.loadHandlers({
  commands: [pingCommand, avatarCommand],
  components: [confirmButton],
  events: [readyEvent],
}, true /* info logs */);
```

## Groups

The second `loadCommands` argument is a group label used internally for tracing and diagnostics.

```ts
await client.loadCommands([adminCommand], "admin");
```

`loadCommands` returns a `Result<true, InternalError>`. The first tuple item is `null` on success and an error on failure. `loadHandlers` handles this internally by calling `client.logger.fatalError(err)`.

## Error handling

Command handlers can reply directly, return a result handled by the command manager, or throw errors that are routed to the configured command error handler.

```ts
import { error, ok } from "@arcscord/error";
import { createCommand } from "arcscord";

export const resultCommand = createCommand({
  slash: {
    name: "result",
    description: "Return a result",
  },
  run: () => {
    if (Math.random() > 0.5) {
      return ok("done");
    }

    return error(new Error("Command failed"));
  },
});
```
