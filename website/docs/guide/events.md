---
sidebar_position: 5
---

# Events

Events are declared with `createEvent` and map to Discord.js event names.
Arcscord does not add gateway intents automatically. Instead, the event manager
can warn or fail loading when a loaded event is not covered by the client intents.
Discord documents gateway intents in the [Gateway intents reference](https://discord.com/developers/docs/events/gateway#gateway-intents), and discord.js documents client setup in its [guide](https://discordjs.guide/).

```ts
import { ArcClient, createEvent } from "arcscord";

export const messageEvent = createEvent({
  event: "messageCreate",
  name: "messageLogger",
  run: (ctx, msg) => {
    ctx.client.logger.info(`message sent by ${msg.author.username}`);
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

## Typed event sources

Discord.js Gateway events use Arcscord's implicit `gatewayEvents` source, so existing handlers do not need to change:

```ts
createEvent({
  event: "messageCreate",
  run: (_ctx, message) => console.log(message.id),
});
```

Packages and applications can define independent sources whose event names map to argument tuples:

```ts
import { createEvent, createEventSource } from "arcscord";

type JobEvents = {
  completed: [jobId: string];
  failed: [jobId: string, reason: Error];
};

export const jobEvents = createEventSource<JobEvents>({ name: "jobs" });

const completed = createEvent({
  source: jobEvents,
  event: "completed",
  run: (ctx, jobId) => {
    ctx.logger.info("Job completed", {
      jobId,
      source: ctx.source.name,
    });
  },
});

await client.loadEvents([completed]);
await client.eventManager.dispatch(jobEvents, "completed", "job_123");
```

External event names can be ordinary string literals; an enum is not required.
Every value in the source map must be an argument tuple. Once `source` is
present, both `createEvent` and `dispatch` accept only names and arguments from
that source. Discord.js event names are therefore rejected for `jobEvents`:

```ts
// TypeScript error: "messageCreate" does not belong to jobEvents
createEvent({
  source: jobEvents,
  event: "messageCreate",
  run() {},
});
```

The explicit `source: gatewayEvents` form is equivalent to omitting `source`
and remains restricted to Discord.js `ClientEvents`.

Source identity is symbol-based, so two sources can safely use the same event and handler names. Custom-source dispatches run matching handlers sequentially, await asynchronous handlers, respect `once` and `beforeReady`, and return a report whose `matched` field is `0` when no handler is registered.

Use `client.eventManager.dispatcher(source)` when a transport needs a bound callback. [`@arcscord/webhooks`](/packages/webhooks) uses this API for signed Discord Webhook Events.

Gateway intent diagnostics apply only to `gatewayEvents`; custom sources never consult the Gateway intent map.

Manager loading, dispatch, execution, and intent checks can also be observed
without changing handler configuration through [diagnostics channels](/guide/diagnostics-channels).

Gateway `executionHandlers` keep their existing Discord.js-only contract and
never receive custom-source events. Configure `sourceExecutionHandlers` when a
custom transport needs its own execution interceptors:

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    event: {
      sourceExecutionHandlers: [async (execution, next) => {
        execution.context.logger.debug("custom event", {
          event: execution.eventName,
          source: execution.source.name,
        });
        return next();
      }],
    },
  },
});
```

This separation preserves the existing `EventExecutionHandler` API while
giving custom sources a sound context through `SourceEventExecutionHandler`.

## Common examples

### `clientReady`

```ts
import { createEvent } from "arcscord";

export const readyEvent = createEvent({
  event: "clientReady",
  options: { once: true },
  run: (ctx) => {
    ctx.client.logger.info(
      `Logged in as ${ctx.client.user?.tag} — watching ${ctx.client.guilds.cache.size} guild(s)`,
    );
  },
});
```

### `messageCreate`

```ts
import { createEvent } from "arcscord";

export const messageCreateEvent = createEvent({
  event: "messageCreate",
  name: "messagePrefixLogger",
  run: (ctx, message) => {
    if (message.author.bot) {
      return;
    }

    ctx.client.logger.debug(`message from ${message.author.username}: ${message.content}`);
  },
});
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

`loadEvents` is async and returns a [`Result`](./error-handling.md) with the number of loaded handlers. Duplicate handler names and unmet intent requirements surface as an `ArcscordError` failure (`EVENT_HANDLER_DUPLICATE` / `EVENT_INTENT_MISSING`) instead of throwing:

```ts
const [err, loadedEvents] = await client.loadEvents([messageEvent, readyEvent]);
if (err !== null) {
  client.logger.fatalError(err);
}
else {
  client.logger.info(`Loaded ${loadedEvents} events`);
}
```

For applications that keep commands, components, and events in one generated
handler list, use `client.loadHandlers`:

```ts
import handlers from "./handlers";

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
        missing: "error",
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
  },
});
```
