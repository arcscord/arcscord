---
sidebar_position: 8
---

# Error handling

Arcscord distinguishes expected failures from unexpected defects.

```text
run() returns error(value)  -> ExecutionExit.failure
run() or middleware throws -> ExecutionExit.defect
```

Expected failures may be plain or tagged objects, strings, native errors, application-specific classes, or any other value. Arcscord imposes neither a failure shape nor a framework error class. A `_tag` field is only a convenient TypeScript convention used in some examples; it is never required.

## ArcscordError

`ArcscordError` is reserved for failures produced by the framework itself. Each instance has a stable, documented `code`, code-specific `metadata`, and an optional native `cause`.

```ts
import { ArcscordError, arcscordErrorCodes } from "arcscord";

const failure = new ArcscordError({
  code: arcscordErrorCodes.CommandRegistrationFailed,
  message: "Failed to register global commands",
  metadata: {
    scope: "global",
    operation: "put",
  },
  cause,
});
```

Use `error.code` for control flow; messages are descriptive and may change. See [Arcscord error codes](../reference/error-codes.md).

Incident IDs belong to an execution failure, not to the error object. Default result handlers generate them for defects so the same ID can appear in logs and the user-facing error message.

## Context helpers

`ctx.error` wraps any expected failure without changing it:

```ts
return ctx.error({
  _tag: "TicketLimitReached",
  current: 3,
  limit: 3,
});
```

The tagged object above is only an example. The same helper accepts any value, such as `ctx.error("ticket limit reached")`, `ctx.error(new DomainError())`, or an untagged object.

Interaction helpers such as `reply`, `editReply`, and `deferReply` return an `ArcscordError` with code `INTERACTION_OPERATION_FAILED` when Discord rejects the operation.

## Dispatch errors

Failures before `run()` starts continue to use `dispatchDiagnostics`:

```ts
managers: {
  command: {
    dispatchDiagnostics: {
      commandNotFound: { level: "warn", reply: false },
      optionParsingFailed: { level: "error" },
      contextCreationFailed: { level: "error" },
      deferFailed: { level: "warn", reply: false },
      autocompleteError: "warn",
    },
  },
}
```

Each dispatch failure is an `ArcscordError` with a stable code. `reply: false` suppresses the user-facing response; otherwise Arcscord uses `client.getErrorMessage(incidentId, locale)` unless a static or dynamic reply is configured.
