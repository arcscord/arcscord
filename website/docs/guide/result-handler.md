---
sidebar_position: 7
---

# Result handlers

Every command, component, and event execution is normalized to an `ExecutionExit` before its result handler is called.

```ts
type ExecutionExit<T, E = unknown> =
  | { status: "success"; value: T }
  | { status: "failure"; failure: E }
  | { status: "defect"; defect: unknown }
  | { status: "interrupted"; reason?: unknown };
```

- `success` means the handler returned normally.
- `failure` means it explicitly returned an error `Result`.
- `defect` means the handler or a middleware threw.
- `interrupted` is reserved for cancellation

Expected failures may be any value; they do not need to extend `Error`:

```ts
const denied = { _tag: "MissingPermission", permission: "BanMembers" } as const;

export const ban = createCommand({
  slash: { name: "ban", description: "Ban a member" },
  run: ctx => ctx.error(denied),
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
            if (isMissingPermission(infos.exit.failure)) {
              await infos.interaction.reply({
                content: "You do not have the required permission.",
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

          case "interrupted":
            client.logger.warn("Command interrupted");
        }
      },
    },
  },
});
```

Command and component payloads contain `interaction`, the resolved handler, its context, locale and defer state, plus `startedAt`, `endedAt`, and `durationMs`. Unexpected defects also receive an `incidentId`.

Event result handlers use the same `exit` model and expose the event handler, event name, timestamps, duration, and optional incident ID.

## Default behavior

The default command and component handlers:

- log successes at debug level;
- log explicit failures and reply with the configured internal-error message;
- log defects with an incident ID and include that ID in the user-facing message;
- log interruptions without attempting an automatic reply.

The default event handler logs failures, defects, and interruptions but never sends a Discord reply.

The result handler is the only API that controls logging, recovery, and user replies. 
