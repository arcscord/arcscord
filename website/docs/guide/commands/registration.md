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

## Registration strategy

Command registration is configurable per scope from the command manager options.

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  applicationId: process.env.DISCORD_APPLICATION_ID!,
  managers: {
    command: {
      registration: {
        global: {
          commands: "put",
          unused: "ignore",
        },
        guild: {
          commands: "create",
          unused: "warn",
        },
      },
    },
  },
});
```

The `commands` option controls how local command definitions are pushed:

| Mode | Behavior |
| --- | --- |
| `put` | Bulk overwrite the full scope. This is the default and removes commands that are not in the local list. |
| `create` | Create or update every local command one by one, without deleting unused commands. |
| `warn` | Compare local commands with Discord and log warnings for missing or different commands. Discord is not modified. |
| `ignore` | Do not create, update, or warn about local commands. |

The `unused` option controls Discord commands that are missing from the local command list:

| Mode | Behavior |
| --- | --- |
| `delete` | Delete unused commands from Discord. |
| `warn` | Log warnings for unused commands, without deleting them. |
| `ignore` | Do nothing for unused commands. This is the default. |

`commands: "put"` uses Discord's bulk overwrite endpoint, so unused commands are removed by Discord even when `unused` is `warn` or `ignore`.

Diff checks include command names, descriptions, options, and localization dictionaries such as `name_localizations` and `description_localizations`.

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

`loadCommands` returns a `Result<number, ArcscordError>`: on success the second tuple item is the count of loaded commands; on failure the first tuple item is an `ArcscordError`. Inspect `error.code` rather than matching the message.

`loadHandlers` handles that failure differently: instead of returning it, it **throws** the `ArcscordError` so a broken startup fails fast. Wrap the call in `try`/`catch` if you want to handle it yourself.

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
