---
sidebar_position: 7
---

# Result handlers

Every manager calls a result handler after a command, component, or event
handler finishes — whether it returned normally or threw. A single callback
covers both cases, distinguished by the `status` field.

## Run return types

Arcscord normalizes whatever your `run()` function returns into a `Result`
before passing it to the result handler. You can return any of:

| Return value | Normalized to |
|---|---|
| `void` / nothing | `ok(true)` |
| `string` | `ok(string)` |
| `true` | `ok(true)` |
| `ok(...)` / `error(...)` | passed through unchanged |

This means you can keep your handler simple without sacrificing observability:

```ts
export const ping = createCommand({
  build: { slash: { name: "ping", description: "Ping!" } },
  run: async (ctx) => {
    await ctx.reply({ content: "Pong!" });
    // return nothing — normalized to ok(true)
  },
});
```

## The `status` discriminant

Every result handler receives an object with a `status` field:

- `"returned"` — `run()` returned normally. `result` holds the normalized
  `Result` — it may be `ok` or `error` depending on what the handler returned.
- `"thrown"` — `run()` threw an unhandled exception. Only `thrownValue` is
  present; there is no `result` field. The thrown value is not pre-wrapped —
  you decide how to handle it.

```ts
managers: {
  command: {
    resultHandler: (infos) => {
      if (infos.status === "thrown") {
        // infos.thrownValue is the raw thrown value — could be anything
        const err = anyToError(infos.thrownValue);
        client.logger.error(`Command threw: ${err.message}`);
        return;
      }

      // infos.status === "returned" — infos.result is available here
      const [err, value] = infos.result;
      if (err) {
        err.generateId();
        client.logger.logError(err);
        return;
      }

      client.logger.debug(`Command "${infos.command.build.slash?.name}" returned ${String(value)}`);
    },
  },
},
```

## Event result handler

Event handlers may return `void`, `string`, `true`, or a full `EventHandleResult`.

```ts
export const messageEvent = createEvent({
  event: "messageCreate",
  run: (ctx, message) => {
    if (message.author.bot) {
      return "ignored bot message";
    }
    // void is fine too
  },
});
```

Configure the result handler via `managers.event.resultHandler`:

```ts
managers: {
  event: {
    resultHandler: (infos) => {
      if (infos.status === "thrown") {
        client.logger.error(`Event ${infos.event.name} threw`, {
          thrownValue: infos.thrownValue,
        });
        return;
      }

      const [err, value] = infos.result;
      if (err) {
        err.generateId();
        client.logger.logError(err);
        return;
      }

      client.logger.debug(`${infos.event.name} → ${String(value)}`);
    },
  },
},
```

The event result handler receives:

| Field | `"returned"` | `"thrown"` |
|---|---|---|
| `status` | `"returned"` | `"thrown"` |
| `result` | normalized `EventHandleResult` | — (not present) |
| `thrownValue` | — (not present) | the raw thrown value |
| `event` | the loaded event handler | same |
| `eventName` | the Discord.js event name | same |

## Command result handler

Configure via `managers.command.resultHandler`:

```ts
import { MessageFlags } from "discord.js";
import { anyToError } from "@arcscord/error";

managers: {
  command: {
    resultHandler: async (infos) => {
      if (infos.status === "thrown") {
        const err = anyToError(infos.thrownValue);
        client.logger.error(`Command threw: ${err.message}`);
        await infos.interaction.reply({
          content: "An unexpected error occurred.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const [err, value] = infos.result;
      if (err) {
        err.generateId();
        client.logger.logError(err);
        const message = client.getErrorMessage(err.id, infos.locale);
        if (infos.defer) {
          await infos.interaction.editReply(message);
        } else {
          await infos.interaction.reply({ ...message, flags: MessageFlags.Ephemeral });
        }
        return;
      }

      client.logger.debug(`Command ${infos.command.build.slash?.name ?? "context"} succeeded`);
    },
  },
},
```

The command result handler receives:

| Field | `"returned"` | `"thrown"` |
|---|---|---|
| `status` | `"returned"` | `"thrown"` |
| `result` | normalized `CommandRunResult` | — (not present) |
| `thrownValue` | — (not present) | the raw thrown value |
| `interaction` | Discord.js command interaction | same |
| `command` | the loaded command handler | same |
| `context` | the Arcscord command context | same |
| `locale` | detected i18next language key | same |
| `defer` | whether the reply was deferred | same |
| `start` / `end` | execution timestamps (ms) | same |

## Component result handler

Configure via `managers.component.resultHandler`:

```ts
import { MessageFlags } from "discord.js";
import { anyToError } from "@arcscord/error";

managers: {
  component: {
    resultHandler: async (infos) => {
      if (infos.status === "thrown") {
        const err = anyToError(infos.thrownValue);
        client.logger.error(`Component ${infos.component.route} threw: ${err.message}`);
        await infos.interaction.reply({
          content: "An unexpected error occurred.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const [err] = infos.result;
      if (err) {
        err.generateId();
        client.logger.logError(err);
        const message = client.getErrorMessage(err.id, infos.locale);
        if (infos.defer) {
          await infos.interaction.editReply(message);
        } else {
          await infos.interaction.reply({ ...message, flags: MessageFlags.Ephemeral });
        }
        return;
      }

      client.logger.debug(`Component ${infos.component.route} succeeded`);
    },
  },
},
```

The component result handler receives the same fields as the command result
handler, with `component` in place of `command`.

## Default behavior

The default result handlers for all three managers:

- **`status === "thrown"`** — wrap `thrownValue` in a framework error
  (`CommandError`, `ComponentError`, or `EventError`), generate an error ID,
  log it with `logError`, and send an ephemeral error reply to the user
  (command and component only).
- **`status === "returned"`, error result** — generate an error ID, log it,
  and send an ephemeral error reply to the user (command and component only).
- **`status === "returned"`, ok result** — log at debug level.

The error reply message comes from `client.getErrorMessage(id, locale)`. You
can customize it via `arcOptions.getErrorMessage` on the client.

For more on pre-run failures (command not found, option parsing errors, etc.)
and how to configure their logging level and user reply, see
[Error handling](./error-handling.md).
