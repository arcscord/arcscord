---
sidebar_position: 7
---

# Result handlers

Every command, component, and event execution is normalized to an `ExecutionExit` before its result handler is called.

```ts
type ExecutionExit<T, E = unknown> =
  | { status: "success"; value: T }
  | { status: "failure"; failure: E }
  | { status: "defect"; defect: unknown };
```

- `success` means the handler returned normally.
- `failure` means it explicitly returned an error `Result`.
- `defect` means the handler or a middleware threw.

Expected failures may be any value; they do not need to extend `Error`. The `_tag` field below is only an example of a convenient TypeScript convention for discriminating application failures. Arcscord does not require it or impose any failure shape:

```ts
type TicketLimitReached = {
  _tag: "TicketLimitReached";
  current: number;
  limit: number;
};

function isTicketLimitReached(value: unknown): value is TicketLimitReached {
  return typeof value === "object"
    && value !== null
    && "_tag" in value
    && value._tag === "TicketLimitReached";
}

export const ticket = createCommand({
  slash: { name: "ticket", description: "Open a support ticket" },
  run: async (ctx) => {
    const current = await ticketStore.countOpenByUser(ctx.user.id);
    const limit = 3;

    if (current >= limit) {
      return ctx.error({ _tag: "TicketLimitReached", current, limit });
    }

    await ticketStore.open(ctx.user.id);
    return ctx.ok();
  },
});
```

## Command result handler

```ts
const client = new ArcClient(token, {
  intents: ["Guilds"],
  managers: {
    command: {
      resultHandler: async (infos) => {
        switch (infos.exit.status) {
          case "success":
            client.logger.debug("Command succeeded", {
              command: infos.interaction.commandName,
              durationMs: infos.durationMs,
            });
            return;

          case "failure":
            if (isTicketLimitReached(infos.exit.failure)) {
              await infos.interaction.reply({
                content: `You already have ${infos.exit.failure.current} open tickets (limit: ${infos.exit.failure.limit}).`,
                flags: MessageFlags.Ephemeral,
              });
              return;
            }
            client.logger.logError(infos.exit.failure);
            return;

          case "defect":
            client.logger.logError(infos.exit.defect, {
              incidentId: infos.incidentId,
            });
            return;
        }
      },
    },
  },
});
```

Command and component payloads contain `interaction`, the resolved handler, its context, locale and defer state, plus `startedAt`, `endedAt`, and `durationMs`. Unexpected defects also receive an `incidentId`.

Event result handlers use the same `exit` model and expose the event handler, event name, timestamps, duration, and optional incident ID.

## Delegating to the default handler

A custom result handler receives the owning manager as its **second argument**. Use it to run your own logic and then hand back to the framework default via `manager.defaultResultHandler(infos)`, instead of reimplementing the default logging and error reply:

```ts
const client = new ArcClient(token, {
  intents: ["Guilds"],
  managers: {
    command: {
      resultHandler: async (infos, manager) => {
        // your own side effect (metrics, audit log, ...)
        await recordCommandUsage(infos.interaction.commandName);

        // then reuse the built-in logging + user-facing error reply
        return manager.defaultResultHandler(infos);
      },
    },
  },
});
```

`defaultResultHandler(infos)` is available on the command, component, and event managers and holds the exact behavior described below.

## Default behavior

The default command and component handlers:

- log successes at debug level;
- log explicit failures and reply with the configured internal-error message;
- log defects with an incident ID and include that ID in the user-facing message.

The default event handler logs failures and defects but never sends a Discord reply.

The result handler is the only API that controls logging, recovery, and user replies. 
