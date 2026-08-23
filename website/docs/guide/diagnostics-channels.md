---
sidebar_position: 8
---

# Diagnostics channels

Arcscord publishes opt-in manager lifecycle messages through Node.js
[`node:diagnostics_channel`](https://nodejs.org/api/diagnostics_channel.html).
Channels are dormant until subscribed: when no listener is present, Arcscord
does not construct the message, timestamps, metadata, or collection copies.

The API covers command, component, and event managers. `LocaleManager` does not
publish diagnostics channels.

## On this page

- [Getting started](#getting-started)
- [Using Node.js directly](#using-nodejs-directly)
- [Message conventions](#message-conventions)
- [Command channels](#command-channels)
- [Component channels](#component-channels)
- [Event channels](#event-channels)
- [Correlation and subscription timing](#correlation-and-subscription-timing)
- [Subscriber safety](#subscriber-safety)
- [Complete example](#complete-example)

## Getting started

[`managerDiagnosticChannels`](https://arcscord.dev/api?package=arcscord&version=main#managerDiagnosticChannels)
provides typed, process-wide channel instances:

```ts
import { managerDiagnosticChannels } from "arcscord";

const onExecution: Parameters<
  typeof managerDiagnosticChannels.command.execute.subscribe
>[0] = (message) => {
  if (message.phase === "end") {
    console.log(message.execution.interaction.id, message.durationMs);
  }
};

managerDiagnosticChannels.command.execute.subscribe(onExecution);

// Remove the same function reference when instrumentation is stopped.
managerDiagnosticChannels.command.execute.unsubscribe(onExecution);
```

The exported object is typed as
[`ManagerDiagnosticChannels`](https://arcscord.dev/api?package=arcscord&version=main#ManagerDiagnosticChannels).
Each listener narrows its message through the `phase` discriminant.

## Using Node.js directly

Channel identity is global by name within a process. Importing Arcscord's
registry is optional at runtime:

```js
import { channel } from "node:diagnostics_channel";

const commandExecute = channel("arcscord:manager:command:execute");

commandExecute.subscribe((message) => {
  if (message.phase === "end") {
    console.log(message.durationMs);
  }
});
```

This returns the same channel instance as
`managerDiagnosticChannels.command.execute`. In plain JavaScript, no Arcscord
type import is necessary. In TypeScript, Node.js types `message` as `unknown`;
use Arcscord's channel registry or import the channel's message type when static
typing is needed.

Keep acquired channels at module scope. This follows Node.js's recommendation
to reuse channel objects and ensures the reference remains alive on Bun.

## Message conventions

Every message contains these fields:

| Field | Type | Description |
| --- | --- | --- |
| `phase` | `"start" \| "end" \| "error"` | Lifecycle phase. A channel may support only a subset. |
| `manager` | `CommandManager \| ComponentManager \| EventManager` | Manager that published the message. |
| `client` | `ArcClient` | Client that owns the manager. |
| `timestamp` | `number` | Unix timestamp in milliseconds when this message was published. |

Lifecycle phases add the following fields consistently:

| Phase | Additional fields |
| --- | --- |
| `start` | `operationId: DiagnosticOperationId`, `startedAt: number` |
| `end` | `operationId: DiagnosticOperationId`, `startedAt: number`, `endedAt: number`, `durationMs: number` |
| `error` | `operationId: DiagnosticOperationId`, `error: unknown` or a narrower channel-specific error type |

[`DiagnosticOperationId`](https://arcscord.dev/api?package=arcscord&version=main#DiagnosticOperationId)
is an opaque, process-local `symbol`. Every phase produced for one operation
contains the same identifier. It is intended as a `Map` or `Set` key and is not
JSON-serializable.

One-shot registry channels publish only `end`; they therefore have no
`startedAt`, `endedAt`, or `durationMs`. The tables below list only fields that
are specific to that channel and phase.

## Command channels

### `arcscord:manager:command:load`

- **Export:** `managerDiagnosticChannels.command.load`
- **Message type:**
  [`CommandLoadDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#CommandLoadDiagnosticMessage)
- **Published by:** `CommandManager.loadCommands()`
- **Use for:** command validation and generated Discord API bodies

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `commands: readonly Command[]`, `group: string` | Transformation and validation are starting. |
| `end` | `commands: readonly Command[]`, `group: string`, `apiCommands: readonly RESTPostAPIApplicationCommandsJSONBody[]` | All definitions were transformed successfully. |
| `error` | `commands: readonly Command[]`, `group: string`, `error: ArcscordError` | A definition, middleware, or autocomplete declaration was invalid. |

### `arcscord:manager:command:register`

- **Export:** `managerDiagnosticChannels.command.register`
- **Message type:**
  [`CommandRegisterDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#CommandRegisterDiagnosticMessage)
- **Published by:** `pushGlobalCommands()` and `pushGuildCommands()`
- **Use for:** Discord REST latency and deployment synchronization

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `commands: readonly RESTPostAPIApplicationCommandsJSONBody[]`, `scope: "global" \| "guild"`, `guildId?: string`, `config: CommandRegistrationScopeConfig` | Synchronization is starting with the resolved scope configuration. |
| `end` | Start fields plus `registrations: readonly ApplicationCommandRegistration[]` | Discord returned the registrations available after synchronization. |
| `error` | Start fields plus `error: ArcscordError` | The application was unavailable or a REST synchronization step failed. |

### `arcscord:manager:command:resolve`

- **Export:** `managerDiagnosticChannels.command.resolve`
- **Message type:**
  [`CommandResolveDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#CommandResolveDiagnosticMessage)
- **Published by:** `CommandManager.resolveCommand()`
- **Use for:** explaining why a built command is or is not dispatchable

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `end` | `command: Command`, `registration?: ApplicationCommandRegistration`, `resolvedName?: string` | Resolution was attempted. Optional fields are absent when no Discord registration matched. |

### `arcscord:manager:command:dispatch`

- **Export:** `managerDiagnosticChannels.command.dispatch`
- **Message type:**
  [`CommandDispatchDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#CommandDispatchDiagnosticMessage)
- **Published by:** the complete command-interaction dispatcher
- **Use for:** end-to-end latency and failures before `run()`

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `interaction: CommandInteraction` | Arcscord received a command interaction. |
| `end` | `interaction: CommandInteraction`, `outcome: CommandExecutionOutcome` | The execution pipeline produced a terminal outcome. |
| `error` | `interaction: CommandInteraction`, `stage: CommandDispatchStage`, `locale?: string`, `error: unknown` | Dispatch stopped during `resolve`, `options`, `context`, `defer`, or `execution`. |

### `arcscord:manager:command:execute`

- **Export:** `managerDiagnosticChannels.command.execute`
- **Message type:**
  [`CommandExecuteDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#CommandExecuteDiagnosticMessage)
- **Published around:** execution interceptors, middleware, and command `run()`
- **Use for:** command duration and normalized success/failure metrics

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `execution: CommandExecutionContext` | The execution-interceptor chain is starting. |
| `end` | `execution: CommandExecutionContext`, `outcome: CommandExecutionOutcome` | The chain completed, including handler failures, defects, or middleware cancellation. |
| `error` | `execution: CommandExecutionContext`, `error: unknown` | The interceptor chain itself failed to produce an outcome. |

### `arcscord:manager:command:autocomplete`

- **Export:** `managerDiagnosticChannels.command.autocomplete`
- **Message type:**
  [`CommandAutocompleteDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#CommandAutocompleteDiagnosticMessage)
- **Published by:** the autocomplete dispatcher
- **Use for:** autocomplete resolution, latency, and failures

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `interaction: AutocompleteInteraction` | Arcscord received an autocomplete interaction. |
| `end` | `interaction: AutocompleteInteraction`, `command: CommandExecutionContext["command"]`, `focused: { name: string; value: string \| number }`, `locale: string` | The matching autocomplete handler completed successfully. |
| `error` | `interaction: AutocompleteInteraction`, `error: unknown`, `command?`, `focused?`, `locale?` | Lookup or execution failed. Optional fields are present only if that step had resolved them. |

## Component channels

### `arcscord:manager:component:load`

- **Export:** `managerDiagnosticChannels.component.load`
- **Message type:**
  [`ComponentLoadDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#ComponentLoadDiagnosticMessage)
- **Published by:** each `loadComponent()` call, including calls from `loadComponents()`
- **Use for:** route and middleware validation

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `components: readonly ComponentHandler[]` | Validation is starting for the contained handler. |
| `end` | `components: readonly ComponentHandler[]`, `loaded: number` | The handler was added to the registry. |
| `error` | `components: readonly ComponentHandler[]`, `error: ArcscordError` | Route parsing, duplicate detection, or middleware validation failed. |

### `arcscord:manager:component:unload`

- **Export:** `managerDiagnosticChannels.component.unload`
- **Message type:**
  [`ComponentUnloadDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#ComponentUnloadDiagnosticMessage)
- **Published by:** `ComponentManager.unloadComponent()`
- **Use for:** registry cleanup auditing

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `end` | `route: string`, `component?: ComponentHandler`, `removed: boolean` | The unload attempt completed. `component` is present only when a handler was removed. |

### `arcscord:manager:component:dispatch`

- **Export:** `managerDiagnosticChannels.component.dispatch`
- **Message type:**
  [`ComponentDispatchDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#ComponentDispatchDiagnosticMessage)
- **Published by:** the complete component-interaction dispatcher
- **Use for:** route matching, context creation, and end-to-end latency

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `interaction: MessageComponentInteraction \| ModalSubmitInteraction` | Arcscord received a component interaction. |
| `end` | `interaction`, `outcome: ComponentExecutionOutcome` | The execution pipeline produced a terminal outcome. |
| `error` | `interaction`, `stage: ComponentDispatchStage`, `locale?: string`, `error: unknown` | Dispatch stopped during `match`, `values`, `context`, `defer`, or `execution`. |

### `arcscord:manager:component:execute`

- **Export:** `managerDiagnosticChannels.component.execute`
- **Message type:**
  [`ComponentExecuteDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#ComponentExecuteDiagnosticMessage)
- **Published around:** execution interceptors, middleware, and component `run()`
- **Use for:** component duration and normalized outcomes

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `execution: ComponentExecutionContext` | The execution-interceptor chain is starting. |
| `end` | `execution: ComponentExecutionContext`, `outcome: ComponentExecutionOutcome` | The chain completed, including handler failures, defects, or middleware cancellation. |
| `error` | `execution: ComponentExecutionContext`, `error: unknown` | The interceptor chain itself failed to produce an outcome. |

## Event channels

### `arcscord:manager:event:load`

- **Export:** `managerDiagnosticChannels.event.load`
- **Message type:**
  [`EventLoadDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#EventLoadDiagnosticMessage)
- **Published by:** each `loadEvent()` call, including calls from `loadEvents()`
- **Use for:** duplicate handlers and intent validation

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `events: readonly AnyLoadableEventHandler[]` | Validation is starting for the contained handler. |
| `end` | `events: readonly AnyLoadableEventHandler[]`, `loaded: number` | The handler was added to its source registry. |
| `error` | `events: readonly AnyLoadableEventHandler[]`, `error: ArcscordError` | A duplicate or configured intent-check failure prevented loading. |

### `arcscord:manager:event:unload`

- **Export:** `managerDiagnosticChannels.event.unload`
- **Message type:**
  [`EventUnloadDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#EventUnloadDiagnosticMessage)
- **Published by:** `EventManager.unloadEvent()`
- **Use for:** Gateway and custom-source registry cleanup

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `end` | `source: EventSource`, `name: string`, `event?: AnyLoadableEventHandler`, `removed: boolean` | The unload attempt completed. `event` is present only when a handler was removed. |

### `arcscord:manager:event:dispatch`

- **Export:** `managerDiagnosticChannels.event.dispatch`
- **Message type:**
  [`EventDispatchDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#EventDispatchDiagnosticMessage)
- **Published around:** delivery to each matched Gateway or custom-source handler
- **Use for:** delivery latency and pre-ready outcomes

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `source: EventSource`, `event: AnyLoadableEventHandler`, `args: readonly unknown[]` | Delivery to one handler is starting. |
| `end` | Start fields plus `outcome: EventExecutionOutcome` | Delivery ended. The outcome may be cancelled by `beforeReady: "drop"` or contain a readiness defect. |

### `arcscord:manager:event:execute`

- **Export:** `managerDiagnosticChannels.event.execute`
- **Message type:**
  [`EventExecuteDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#EventExecuteDiagnosticMessage)
- **Published around:** Gateway or custom-source execution interceptors and `run()`
- **Use for:** handler duration and normalized outcomes

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `start` | `execution: AnyEventExecutionContext \| AnySourceEventExecutionContext` | The appropriate execution-interceptor chain is starting. |
| `end` | `execution`, `outcome: EventExecutionOutcome` | The chain completed, including handler success, failure, or defect. |
| `error` | `execution`, `error: unknown` | The interceptor chain itself failed to produce an outcome. |

### `arcscord:manager:event:intent`

- **Export:** `managerDiagnosticChannels.event.intent`
- **Message type:**
  [`EventIntentDiagnosticMessage`](https://arcscord.dev/api?package=arcscord&version=main#EventIntentDiagnosticMessage)
- **Published when:** Gateway intent analysis finds missing or partial coverage
- **Use for:** startup configuration diagnostics

| Phase | Channel-specific fields | Meaning |
| --- | --- | --- |
| `end` | `issue: EventIntentCheckIssue`, `action: "off" \| "warn" \| "error"` | An issue was found and the manager resolved the configured action. Custom sources and `intentCheck: false` do not publish here. |

## Correlation and subscription timing

Execution contexts, interactions, handlers, and event sources are live object
references. Use their identity or stable Discord IDs to correlate messages.
`ExecutionOutcome` values are discriminated by `kind` (`completed` or
`cancelled`); completed outcomes expose an `exit` discriminated by `status`
(`success`, `failure`, or `defect`).

Arcscord starts diagnostic work only when the channel has a subscriber. It
checks `hasSubscribers` again before constructing a terminal message, so no
terminal payload or diagnostic timestamp is calculated when the channel has
become empty.

Subscriptions otherwise follow the native Node.js semantics: `publish()` calls
the subscribers present at publication time. A subscriber installed midway can
therefore receive an `end` or `error` without its corresponding `start`, for
example when it replaces another subscriber synchronously. Track
`operationId`s received during `start` and ignore unknown terminal identifiers
when complete lifecycle pairs are required.

## Subscriber safety

Subscribers run synchronously in the publisher's execution context. Keep them
small and send expensive work to a queue or telemetry SDK. Arcscord does not
catch subscriber exceptions; Node.js reports them through its native
`uncaughtException` behavior.

Payloads expose live Arcscord and Discord.js objects and may include user
content or identifiers. Do not mutate them or serialize entire payloads
blindly. Select explicit fields before exporting telemetry. Arcscord never adds
the client token to a diagnostic message.

## Complete example

This example records command latency and outcomes without changing manager
configuration:

```ts
import type { DiagnosticOperationId } from "arcscord";
import { managerDiagnosticChannels } from "arcscord";

const activeCommands = new Set<DiagnosticOperationId>();

managerDiagnosticChannels.command.execute.subscribe((message) => {
  if (message.phase === "start") {
    activeCommands.add(message.operationId);
    return;
  }

  // A subscriber installed during an operation may see only its terminal phase.
  if (!activeCommands.delete(message.operationId) || message.phase !== "end") {
    return;
  }

  const status = message.outcome.kind === "completed"
    ? message.outcome.exit.status
    : "cancelled";

  metrics.histogram("arcscord.command.duration", message.durationMs, {
    command: message.execution.interaction.commandName,
    status,
  });
});

managerDiagnosticChannels.command.dispatch.subscribe((message) => {
  if (message.phase === "error") {
    metrics.increment("arcscord.command.dispatch_error", {
      stage: message.stage,
    });
  }
});
```

The runnable
[`starter-bot`](https://github.com/arcscord/arcscord/tree/main/examples/starter-bot/src/diagnostics.ts)
contains command, component, and intent-channel subscribers.
