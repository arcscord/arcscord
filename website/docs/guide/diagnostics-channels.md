---
sidebar_position: 8
---

# Diagnostics channels

Arcscord publishes opt-in manager lifecycle data through Node.js
[`node:diagnostics_channel`](https://nodejs.org/api/diagnostics_channel.html).
There is no configuration flag: subscribing to a channel enables it, and an
unobserved channel does not build or publish diagnostic messages.

```ts
import { managerDiagnosticChannels } from "arcscord";

const onExecution: Parameters<
  typeof managerDiagnosticChannels.command.execute.subscribe
>[0] = (message) => {
  if (message.phase === "end") {
    console.log(message.execution.interaction.id, message.durationMs, message.outcome);
  }
};

managerDiagnosticChannels.command.execute.subscribe(onExecution);
// Later:
managerDiagnosticChannels.command.execute.unsubscribe(onExecution);
```

`managerDiagnosticChannels` holds the process-wide channel instances. Keep and
reuse these references, which also matches Bun's `node:diagnostics_channel`
compatibility requirements.

## Subscribe directly through Node.js

The Arcscord export is optional at runtime. Diagnostics channels are global by
name within a process, so asking Node.js for the same name returns the same
channel instance:

```js
import { channel } from "node:diagnostics_channel";

const executions = channel("arcscord:manager:command:execute");

executions.subscribe((message) => {
  if (message.phase === "end") {
    console.log(message.durationMs);
  }
});
```

The name-based API works in plain JavaScript without importing anything from
Arcscord besides the framework itself. In TypeScript, Node.js intentionally
types `message` as `unknown`; importing `managerDiagnosticChannels` or the
corresponding `*DiagnosticMessage` type from `arcscord` adds static typing but
does not change runtime behavior. Keep the `Channel` reference at module scope,
especially on Bun.

## Channels

| Manager | Operation | Channel name | Phases and notable fields |
| --- | --- | --- | --- |
| Command | Load definitions | `arcscord:manager:command:load` | `start`, `end`, `error`; commands, group, generated API commands or validation error |
| Command | Register with Discord | `arcscord:manager:command:register` | `start`, `end`, `error`; scope, guild, registration config, request bodies and registrations/error |
| Command | Resolve registration | `arcscord:manager:command:resolve` | `end`; definition, matching Discord registration and resolved name |
| Command | Dispatch interaction | `arcscord:manager:command:dispatch` | `start`, `end`, `error`; interaction, outcome, locale and failing stage |
| Command | Execute handler pipeline | `arcscord:manager:command:execute` | `start`, `end`, `error`; typed execution context and normalized outcome |
| Command | Autocomplete | `arcscord:manager:command:autocomplete` | `start`, `end`, `error`; interaction, focused option, command, locale and error |
| Component | Load handler | `arcscord:manager:component:load` | `start`, `end`, `error`; handlers, count or validation error |
| Component | Unload handler | `arcscord:manager:component:unload` | `end`; route, handler and removal status |
| Component | Dispatch interaction | `arcscord:manager:component:dispatch` | `start`, `end`, `error`; interaction, outcome, locale and failing stage |
| Component | Execute handler pipeline | `arcscord:manager:component:execute` | `start`, `end`, `error`; typed execution context and normalized outcome |
| Event | Load handler | `arcscord:manager:event:load` | `start`, `end`, `error`; handlers, count or duplicate/intent error |
| Event | Unload handler | `arcscord:manager:event:unload` | `end`; source, handler name, handler and removal status |
| Event | Dispatch delivery | `arcscord:manager:event:dispatch` | `start`, `end`; source, handler, arguments and outcome, including pre-ready cancellation |
| Event | Execute handler pipeline | `arcscord:manager:event:execute` | `start`, `end`, `error`; gateway/custom-source execution and normalized outcome |
| Event | Check Gateway intents | `arcscord:manager:event:intent` | `end`; structured intent issue and configured action |

Every message also contains `manager`, `client`, and a publication `timestamp`.
`start` messages contain `startedAt`; `end` messages additionally contain
`endedAt` and `durationMs`. `error` messages contain the actual error reference.
The `phase` property is the discriminant used by TypeScript to narrow each
public message union.

## Payload variable reference

All values are live runtime references unless their type is a primitive. The
tables below list fields added to the common lifecycle fields; they are not
copies and should not be mutated.

### Variables shared by every channel

| Variable | Available in | Type | Description |
| --- | --- | --- | --- |
| `phase` | Every message | `"start" \| "end" \| "error"` | Discriminates the message union. Some one-shot channels only publish `end`. |
| `manager` | Every message | `CommandManager`, `ComponentManager`, or `EventManager` | Manager that published the message. |
| `client` | Every message | `ArcClient` | Client that owns the manager. |
| `timestamp` | Every message | `number` | Unix timestamp in milliseconds when this message was published. |
| `startedAt` | `start`, `end` | `number` | Unix timestamp at the start of the observed operation. |
| `endedAt` | `end` | `number` | Unix timestamp when the operation ended. |
| `durationMs` | `end` | `number` | `endedAt - startedAt`. |
| `error` | `error` | Channel-specific error type or `unknown` | Original error reference; it is not serialized or cloned. |

### Command payload variables

| Channel | Phase | Additional variables |
| --- | --- | --- |
| `command.load` | `start` | `commands: readonly Command[]`, `group: string` |
| `command.load` | `end` | `commands`, `group`, `apiCommands: readonly RESTPostAPIApplicationCommandsJSONBody[]` |
| `command.load` | `error` | `commands`, `group`, `error: ArcscordError` |
| `command.register` | `start` | `commands: readonly RESTPostAPIApplicationCommandsJSONBody[]`, `scope: "global" \| "guild"`, `guildId?: string`, `config: CommandRegistrationScopeConfig` |
| `command.register` | `end` | Start variables plus `registrations: readonly ApplicationCommandRegistration[]` |
| `command.register` | `error` | Start variables plus `error: ArcscordError` |
| `command.resolve` | `end` | `command: Command`, `registration?: ApplicationCommandRegistration`, `resolvedName?: string` |
| `command.dispatch` | `start` | `interaction: CommandInteraction` |
| `command.dispatch` | `end` | `interaction`, `outcome: CommandExecutionOutcome` |
| `command.dispatch` | `error` | `interaction`, `stage: CommandDispatchStage`, `locale?: string`, `error: unknown` |
| `command.execute` | `start` | `execution: CommandExecutionContext` |
| `command.execute` | `end` | `execution`, `outcome: CommandExecutionOutcome` |
| `command.execute` | `error` | `execution`, `error: unknown` |
| `command.autocomplete` | `start` | `interaction: AutocompleteInteraction` |
| `command.autocomplete` | `end` | `interaction`, `command`, `focused: { name: string; value: string \| number }`, `locale: string` |
| `command.autocomplete` | `error` | `interaction`, `error: unknown`, and optional `command`, `focused`, and `locale` when resolution reached them |

`CommandDispatchStage` is `"resolve" | "options" | "context" | "defer" |
"execution"`.

### Component payload variables

| Channel | Phase | Additional variables |
| --- | --- | --- |
| `component.load` | `start` | `components: readonly ComponentHandler[]` |
| `component.load` | `end` | `components`, `loaded: number` |
| `component.load` | `error` | `components`, `error: ArcscordError` |
| `component.unload` | `end` | `route: string`, `component?: ComponentHandler`, `removed: boolean` |
| `component.dispatch` | `start` | `interaction: MessageComponentInteraction \| ModalSubmitInteraction` |
| `component.dispatch` | `end` | `interaction`, `outcome: ComponentExecutionOutcome` |
| `component.dispatch` | `error` | `interaction`, `stage: ComponentDispatchStage`, `locale?: string`, `error: unknown` |
| `component.execute` | `start` | `execution: ComponentExecutionContext` |
| `component.execute` | `end` | `execution`, `outcome: ComponentExecutionOutcome` |
| `component.execute` | `error` | `execution`, `error: unknown` |

`ComponentDispatchStage` is `"match" | "values" | "context" | "defer" |
"execution"`.

### Event payload variables

| Channel | Phase | Additional variables |
| --- | --- | --- |
| `event.load` | `start` | `events: readonly AnyLoadableEventHandler[]` |
| `event.load` | `end` | `events`, `loaded: number` |
| `event.load` | `error` | `events`, `error: ArcscordError` |
| `event.unload` | `end` | `source: EventSource`, `name: string`, `event?: AnyLoadableEventHandler`, `removed: boolean` |
| `event.dispatch` | `start` | `source: EventSource`, `event: AnyLoadableEventHandler`, `args: readonly unknown[]` |
| `event.dispatch` | `end` | `source`, `event`, `args`, `outcome: EventExecutionOutcome` |
| `event.execute` | `start` | `execution: AnyEventExecutionContext \| AnySourceEventExecutionContext` |
| `event.execute` | `end` | `execution`, `outcome: EventExecutionOutcome` |
| `event.execute` | `error` | `execution`, `error: unknown` |
| `event.intent` | `end` | `issue: EventIntentCheckIssue`, `action: "off" \| "warn" \| "error"` |

The execution outcomes are also discriminated unions. `outcome.kind` is
`"completed"` or `"cancelled"`; a completed outcome exposes `outcome.exit`,
whose `status` is `"success"`, `"failure"`, or `"defect"`. This lets a
subscriber narrow all result data without unsafe casts.

## Command channels

### `arcscord:manager:command:load`

Observes the synchronous validation and transformation performed by
`CommandManager.loadCommands()`.

- `start`: exposes the original `commands` array and its `group` label.
- `end`: adds the generated Discord API command bodies in `apiCommands`.
- `error`: exposes the validation or transformation `error`; no command bodies
  are registered after this phase.

Use this channel to audit generated command definitions or diagnose a command
that is rejected before any Discord REST request.

### `arcscord:manager:command:register`

Observes `pushGlobalCommands()` and `pushGuildCommands()` while they synchronize
command bodies with Discord.

- `start`: contains `scope`, optional `guildId`, normalized registration
  `config`, and the outgoing `commands`.
- `end`: adds the resolved Discord `registrations` returned after the sync.
- `error`: exposes REST, application availability, or synchronization errors.

This is the appropriate channel for deployment metrics, REST latency, and
global-versus-guild registration troubleshooting.

### `arcscord:manager:command:resolve`

Publishes one `end` message whenever `resolveCommand()` attempts to associate a
local definition with Discord registration data. `registration` and
`resolvedName` are absent when no match exists. It is useful for explaining why
a successfully built command is not available to the runtime dispatcher.

### `arcscord:manager:command:dispatch`

Observes the complete lifecycle of a command interaction, including work that
happens before `run()`.

- `start`: contains the raw Discord.js `interaction`.
- `end`: contains the normalized execution `outcome`.
- `error`: contains the detected `locale`, `error`, and a `stage` of `resolve`,
  `options`, `context`, `defer`, or `execution`.

Use this channel for end-to-end interaction latency and failures that execution
interceptors cannot see, such as option parsing or context creation errors.

### `arcscord:manager:command:execute`

Wraps the configured execution-interceptor chain, command middleware, and
handler `run()` call.

- `start`: exposes the typed `execution` context.
- `end`: exposes the same context and its normalized `outcome`. Handler failures,
  thrown defects, and middleware cancellation are represented inside this
  outcome rather than as a channel `error` phase.
- `error`: means the execution-interceptor chain itself failed and Arcscord
  could not obtain an outcome.

This is the primary channel for command timing, success/failure rates, and
correlation by interaction ID.

### `arcscord:manager:command:autocomplete`

Observes autocomplete lookup and handler execution.

- `start`: contains the autocomplete `interaction`.
- `end`: adds the resolved `command`, `focused` option, and `locale`.
- `error`: contains the information available at the failure point plus the
  thrown or returned `error`.

It covers missing commands and handlers, returned autocomplete errors, and
thrown defects.

## Component channels

### `arcscord:manager:component:load`

Publishes `start`, `end`, or `error` for each `loadComponent()` call, including
calls made by `loadComponents()`. Messages expose the component reference in
`components`; a successful `end` includes `loaded`, while `error` identifies an
invalid route, duplicate route, or middleware validation failure.

### `arcscord:manager:component:unload`

Publishes one `end` message after every `unloadComponent()` attempt. `route` is
always present, `removed` reports whether the registry changed, and `component`
contains the removed handler when found. This also makes failed cleanup attempts
observable without changing the method's boolean return value.

### `arcscord:manager:component:dispatch`

Observes a component interaction from receipt through its terminal outcome.

- `start`: contains the message-component or modal `interaction`.
- `end`: contains the normalized execution `outcome`.
- `error`: adds the `locale`, actual `error`, and a `stage` of `match`, `values`,
  `context`, `defer`, or `execution`.

This channel exposes route misses, ambiguous matches, invalid typed-select
values, modal parsing failures, and defer failures before handler execution.

### `arcscord:manager:component:execute`

Wraps component execution interceptors, middleware, and `run()`. Its phases have
the same meaning as command execution: `start` exposes `execution`, `end` adds a
normalized `outcome`, and `error` is reserved for a broken interceptor chain.
The component route and interaction ID are available through the execution
context.

## Event channels

### `arcscord:manager:event:load`

Publishes `start`, `end`, or `error` for each `loadEvent()` call, including calls
made by `loadEvents()`. It exposes the handler in `events`; `error` reports a
duplicate handler or a configured intent-check failure.

### `arcscord:manager:event:unload`

Publishes one `end` message for every unload attempt. It includes the event
`source`, handler `name`, `removed` status, and the removed `event` reference
when available. Gateway and custom sources use the same payload.

### `arcscord:manager:event:dispatch`

Observes delivery to one matched event handler, not merely the outer custom
source dispatch call.

- `start`: exposes `source`, `event`, and the original `args` array.
- `end`: adds the normalized `outcome` and timing.

An `end` outcome can be `cancelled` when the handler's `beforeReady` policy drops
the event. A readiness timeout is represented as a completed defect outcome.

### `arcscord:manager:event:execute`

Wraps the Gateway or custom-source execution-interceptor chain and handler
`run()` call. `execution` is the typed Gateway/custom-source context. Handler
successes, failures, and defects appear in the `end` outcome; `error` means the
interceptor chain itself failed to produce an outcome.

### `arcscord:manager:event:intent`

Publishes one `end` message whenever intent analysis finds missing or partial
Gateway coverage. `issue` contains the handler, requirement, present/missing
intents, coverage targets, and human-readable message; `action` is the resolved
`off`, `warn`, or `error` policy. Custom event sources and managers configured
with `intentCheck: false` never publish here.

## Correlation and subscription timing

The execution context, interaction, handler, or event source reference can be
used to correlate lifecycle messages. An operation only opts into diagnostics
when a subscriber exists at its start. Arcscord checks again before a terminal
publication, so unsubscribing during an operation avoids building its remaining
messages, while subscribing midway does not produce an orphaned `end` message.

Subscribers run synchronously in the publisher's execution context. Keep them
small and hand work to an external queue when necessary. Arcscord intentionally
does not catch subscriber exceptions; Node.js reports them through its native
`uncaughtException` behavior.

## Data safety

Messages expose live Arcscord and Discord.js objects to support tracing,
metrics, auditing, and custom observability integrations. They may contain user
content, identifiers, or other application data. Treat them as sensitive, do
not mutate them, and select explicit fields before serializing or exporting
them. Tokens are never added by Arcscord's diagnostic payloads.

Arcscord uses stable `channel()` instances rather than the experimental
`tracingChannel()` or `boundedChannel()` helpers. Channel names include the
`arcscord` package prefix and every payload is documented, following Node.js's
guidance for module authors.
