---
sidebar_position: 7
---

# Execution handlers

Execution handlers are Koa-style interceptors around command middleware and
`run()`, component middleware and `run()`, or an event's `run()`.

```ts
const metricsHandler: CommandExecutionHandler = async (execution, next) => {
  metrics.increment("commands.started", {
    command: execution.interaction.commandName,
  });

  const outcome = await next();

  metrics.timing("commands.duration", outcome.durationMs);
  return outcome;
};
```

Code before `next()` runs in declaration order. Code after `next()` runs in
reverse order. An execution handler can also skip `next()` to short-circuit the
execution or return a transformed outcome.

## Outcomes

`next()` returns an `ExecutionOutcome`:

```ts
type ExecutionOutcome<T, E = unknown> =
  | {
      kind: "completed";
      exit: ExecutionExit<T, E>;
      startedAt: number;
      endedAt: number;
      durationMs: number;
      incidentId?: string;
    }
  | {
      kind: "cancelled";
      startedAt: number;
      endedAt: number;
      durationMs: number;
    };
```

`kind: "cancelled"` means command or component middleware deliberately stopped
before `run()`. Completed executions contain the existing `ExecutionExit`:

```ts
type ExecutionExit<T, E = unknown> =
  | { status: "success"; value: T }
  | { status: "failure"; failure: E }
  | { status: "defect"; defect: unknown };
```

- `success` means `run()` returned normally.
- `failure` means middleware or `run()` returned an expected failure.
- `defect` means middleware or `run()` threw.

## Configuring a chain

Providing `executionHandlers` replaces Arcscord's default execution handler.
Add the exported default handler explicitly when you want to augment rather
than replace the built-in behavior:

```ts
import {
  ArcClient,
  defaultCommandExecutionHandler,
  type CommandExecutionHandler,
} from "arcscord";

const metricsHandler: CommandExecutionHandler = async (execution, next) => {
  const outcome = await next();

  await recordCommandExecution({
    command: execution.interaction.commandName,
    outcome,
  });

  return outcome;
};

const client = new ArcClient(token, {
  intents: ["Guilds"],
  managers: {
    command: {
      executionHandlers: [
        defaultCommandExecutionHandler,
        metricsHandler,
      ],
    },
  },
});
```

With this order, the default handler receives the final outcome after inner
handlers have transformed it. The equivalent exports for the other managers are
`defaultComponentExecutionHandler` and `defaultEventExecutionHandler`.

The three default execution handlers own Arcscord's built-in logging and error
reply behavior directly. They do not delegate to the deprecated
`defaultResultHandler()`.

An empty array is valid: middleware and `run()` still execute, but Arcscord does
not apply any result logging or error reply.

## Short-circuiting and transforming

Every execution context provides `complete(exit)` and `cancel()` helpers. They
create a correctly timed outcome and make short-circuiting straightforward:

```ts
const maintenanceHandler: CommandExecutionHandler = async (execution, next) => {
  if (maintenance.enabled) {
    return execution.complete(executionFailure({
      code: "MAINTENANCE",
    }));
  }

  return next();
};
```

An interceptor can transform an outcome after `next()`:

```ts
const recoveryHandler: CommandExecutionHandler = async (execution, next) => {
  const outcome = await next();

  if (outcome.kind === "completed" && outcome.exit.status === "failure") {
    const recovered = await recover(outcome.exit.failure);
    if (recovered) {
      return execution.complete(executionSuccess("recovered"));
    }
  }

  return outcome;
};
```

Each `next()` function may only be called once. Arcscord contains and logs an
uncaught execution-handler error instead of leaking an unhandled rejection into
Discord.js.

## Manager-specific context

Command and component execution handlers receive the resolved handler,
interaction, Arcscord context, locale, defer state, and timing controls.

Event execution handlers additionally receive the typed `EventContext` and the
Discord.js event arguments:

```ts
const auditEvents: EventExecutionHandler = async (execution, next) => {
  if (execution.eventName === "messageCreate") {
    const [message] = execution.args;
    audit.debug("message received", { messageId: message.id });
  }

  return next();
};
```

Resolution, context creation, pre-reply defer, and `dispatchDiagnostics` remain
outside the execution-handler chain.

## Migrating from `resultHandler`

`resultHandler`, its payload types, and `manager.defaultResultHandler()` remain
available for compatibility but are deprecated. Existing configurations keep
their previous behavior.

```ts
// Deprecated, but still supported
command: {
  resultHandler: async (infos, manager) => {
    await recordCommandUsage(infos.interaction.commandName);
    return manager.defaultResultHandler(infos);
  },
}
```

Migrate by moving pre-execution work before `next()`, post-execution work after
it, and explicitly including the appropriate default execution handler.
`resultHandler` and `executionHandlers` cannot be configured together.

The normal Arcscord path already uses the execution-handler implementation.
Removing the legacy result-handler API in Arcscord v2 will therefore not change
the default runtime behavior.

The default command and component execution handlers log successes, log failures
and defects, and send the configured internal-error reply. The default event
execution handler logs failures and defects without replying to Discord.
