---
sidebar_position: 5
---

# Events

Events are declared with `createEvent` and map to Discord.js event names.
Arcscord does not add gateway intents automatically. Instead, the event manager
can warn or throw when a loaded event is not covered by the client intents.
Discord documents gateway intents in the [Gateway intents reference](https://discord.com/developers/docs/events/gateway#gateway-intents), and discord.js documents client setup in its [guide](https://discordjs.guide/).

```ts
import { ArcClient, createEvent } from "arcscord";

export const messageEvent = createEvent({
  event: "messageCreate",
  name: "messageLogger",
  run: (ctx, msg) => {
    ctx.client.logger.info(`message sent by ${msg.author.username}`);
    return ctx.ok(true);
  },
});

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages"],
  managers: {
    event: {
      intentCheck: {
        missing: "warn",
        partialCoverage: "off",
        coverage: {
          guild: true,
          dm: true,
        },
        ignore: [],
      },
    },
  },
});

await client.loadEvents([messageEvent]);
```

## Loading events

Use `client.loadEvents` when you already have an array of event handlers:

```ts
import { ArcClient } from "arcscord";
import { messageEvent } from "./events/message";
import { readyEvent } from "./events/ready";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages"],
});

await client.loadEvents([messageEvent, readyEvent]);
```

`loadEvents` returns the number of loaded handlers:

```ts
const loadedEvents = await client.loadEvents([messageEvent, readyEvent]);
client.logger.info(`Loaded ${loadedEvents} events`);
```

For applications that keep commands, components, and events in one generated
handler list, use `client.loadHandlers`:

```ts
import handlers from "./_handlers";

await client.loadHandlers(handlers, true /* info logs */);
```

`loadHandlers` loads events first, then components, then waits for the client to
be ready before registering commands.

You can also access the manager directly:

```ts
await client.eventManager.loadEvent(messageEvent);
await client.eventManager.loadEvents([messageEvent, readyEvent]);
```

To remove a loaded handler, unload it by handler name:

```ts
client.eventManager.unloadEvent("messageLogger");
```

`unloadEvent` removes the Discord.js listener registered by Arcscord and returns
`true` when a handler was found.

## Intent checks

`intentCheck` validates the events you load against `client.options.intents`.
It never mutates the client intents.

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    event: {
      intentCheck: {
        missing: "throw",
        partialCoverage: "warn",
        coverage: {
          guild: true,
          dm: false,
        },
        ignore: ["presenceUpdate"],
      },
    },
  },
});
```

Arcscord models event intent requirements in three categories:

- `none`: the event does not require a gateway intent.
- `all`: every listed intent must be configured.
- `oneOf`: at least one listed intent can receive the event.

`missing` is used when an event cannot be received with the configured intents:

- for `all`, one or more required intents are missing;
- for `oneOf`, none of the possible intents are configured.

For example, `guildCreate` requires `Guilds`, while `messageCreate` can be
received through `GuildMessages` for guild messages or `DirectMessages` for DM
messages.

`partialCoverage` is used only for `oneOf` events. It reports that the event is
covered, but not for every target you expect. The `coverage` object defines
those expectations:

```ts
const guildOnlyClient = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages"],
  managers: {
    event: {
      intentCheck: {
        missing: "warn",
        partialCoverage: "warn",
        coverage: {
          guild: true,
          dm: false,
        },
      },
    },
  },
});
```

With this configuration, `messageCreate` is accepted with only `GuildMessages`
because DM coverage is explicitly disabled.

For a bot that should receive both guild and DM messages:

```ts
const guildAndDmClient = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages", "DirectMessages"],
  managers: {
    event: {
      intentCheck: {
        missing: "warn",
        partialCoverage: "warn",
        coverage: {
          guild: true,
          dm: true,
        },
      },
    },
  },
});
```

If `DirectMessages` is missing in that setup, Arcscord reports partial coverage
instead of pretending the event is fully configured.

`coverage` does not weaken `missing`: if neither `GuildMessages` nor
`DirectMessages` is configured for `messageCreate`, `missing` still applies even
when `coverage.dm` is `false`.

The default intent check configuration is:

```ts
{
  missing: "warn",
  partialCoverage: "off",
  coverage: {
    guild: true,
    dm: true,
  },
  ignore: [],
}
```

Set `intentCheck: false` to disable the check.

## Readiness

Handlers are registered immediately. Use `beforeReady` to control what happens
if Discord.js emits the event before `ArcClient.waitReady()` has completed.

```ts
export const queuedMessageEvent = createEvent({
  event: "messageCreate",
  options: {
    beforeReady: "queue",
  },
  run: (ctx, msg) => {
    ctx.client.logger.info(msg.id);
    return ctx.ok(true);
  },
});
```

Available modes:

- `"run"`: run immediately, even before ready. This is the default.
- `"queue"`: wait for `client.waitReady()` before running the handler.
- `"drop"`: ignore events received before ready.

## Once

Use `once` for handlers that should run once. Arcscord also removes the handler
from the event manager registry after the first event.

```ts
export const startupEvent = createEvent({
  event: "clientReady",
  options: {
    once: true,
  },
  run: (ctx) => {
    ctx.client.logger.info("client ready");
    return ctx.ok(true);
  },
});
```
