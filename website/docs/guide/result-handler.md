---
sidebar_position: 7
---

# Result handlers

Managers call a result handler after a command, component, or event handler
returns a result. This page documents the event result handler first. Command
and component result handlers follow the same idea and will be documented later.

## Event result handler

Event handlers return an `EventHandleResult`:

```ts
import { createEvent } from "arcscord";

export const messageEvent = createEvent({
  event: "messageCreate",
  run: (ctx, message) => {
    if (message.author.bot) {
      return ctx.ok("ignored bot message");
    }

    return ctx.ok(true);
  },
});
```

By default, Arcscord logs event errors through the event manager logger. You can
replace that behavior with `managers.event.resultHandler`:

```ts
import { ArcClient } from "arcscord";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages"],
  managers: {
    event: {
      resultHandler: async ({ result, event, eventName }) => {
        const [err, value] = result;

        if (err) {
          err.generateId();
          client.logger.logError(err);
          return;
        }

        client.logger.debug(
          `Event ${event.name} handled ${String(eventName)} with ${String(value)}`,
        );
      },
    },
  },
});
```

The event result handler receives:

- `result`: the result returned by the event `run` function.
- `event`: the loaded event handler.
- `eventName`: the Discord.js event name.

The result handler may be async. Arcscord awaits it before finishing the event
execution path.

## Handling thrown errors

If an event handler throws, Arcscord converts the thrown value to an
`EventError` and passes it to the result handler as an error result:

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages"],
  managers: {
    event: {
      resultHandler: ({ result, event }) => {
        const [err] = result;

        if (!err) {
          return;
        }

        err.generateId();
        client.logger.error(`Event ${event.name} failed`, {
          errorId: err.id,
          event: event.event,
        });
      },
    },
  },
});
```

Prefer returning `ctx.error(...)` for expected event failures and throwing only
for unexpected failures.

## Default behavior

The default event result handler checks the result and logs errors:

```ts
async handleResult(infos) {
  const [err] = infos.result;

  if (err !== null) {
    err.generateId();
    this.logger.logError(err);
  }
}
```

Successful event results are ignored by default.
