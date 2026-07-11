---
sidebar_position: 5
description: A lightweight extension of the native Error class that adds structured debug context.
---

# @arcscord/better-error

A lightweight extension of the native `Error` class that adds structured debug context. When something goes wrong deep in a call stack, it is often useful to attach extra information — the file that was being processed, the value that caused the issue, the step that failed — without having to encode everything into the error message string.

`BaseError` accepts a `debugs` object alongside the message, keeping diagnostic data structured and inspectable rather than buried in a formatted string. It also supports error chaining via `originalError`, auto-generated UUIDs for error tracking, and formatted stack traces. It is a standalone utility package; the Arcscord framework itself uses the code-based `ArcscordError` type.

## Install

```sh
pnpm add @arcscord/better-error
```

## Basic usage

```ts
import { BaseError } from "@arcscord/better-error";

const err = new BaseError({
  message: "Failed to load config",
  debugs: {
    path: "/etc/bot/config.json",
    reason: "file not found",
  },
});

console.error(err.message);       // "Failed to load config"
console.error(err.getDebugsObject()); // { path: "...", reason: "...", stack1: "...", ... }
```

## Constructor options

```ts
new BaseError(options: string | ErrorOptions)
```

Accepts either a plain string (used as the message) or an options object:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `message` | `string` | — | The error message. |
| `name` | `string` | `"baseError"` | The error name, shown in stack traces. |
| `originalError` | `BaseError \| Error` | — | The underlying error that caused this one. |
| `debugs` | `Record<string, unknown>` | — | Arbitrary key/value pairs attached to the error. |
| `autoGenerateId` | `boolean` | `false` | Automatically generate a UUID v4 ID. |
| `customId` | `string` | — | Manually set an ID instead of auto-generating. |

## Error chaining

Pass the original error as `originalError` to preserve the cause chain. Its debugs and stack are included in `getDebugsObject()` by default.

```ts
try {
  JSON.parse(rawInput);
} catch (cause) {
  throw new BaseError({
    message: "Invalid bot configuration",
    originalError: cause instanceof Error ? cause : new Error(String(cause)),
    debugs: { rawInput },
  });
}
```

## Error IDs

IDs are useful for correlating a user-facing error message with a log entry.

```ts
// Auto-generate a UUID
const err = new BaseError({ message: "Oops", autoGenerateId: true });
console.log(err.id); // "f47ac10b-58cc-..."

// Or assign one manually
const err2 = new BaseError({ message: "Oops", customId: "ERR_001" });

// Or generate after construction
const err3 = new BaseError("Oops").generateId();
```

## Getting debug information

### `getDebugsObject(options?)`

Returns all debug data as an object. Includes the error ID, custom debugs, stack trace, and original error debugs by default.

```ts
err.getDebugsObject();
// {
//   errorId: "...",
//   path: "/etc/bot/config.json",
//   reason: "file not found",
//   stack1: "Error: Failed to load config",
//   stack2: "    at ...",
//   ...
// }
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `boolean` | `true` | Include the error ID. |
| `originalErrorDebugs` | `boolean \| GetDebugOptions` | `true` | Include original error's debugs. |
| `stack` | `boolean` | `true` | Include the stack trace. |
| `stackFormat` | `"default" \| "split"` | `"split"` | `"split"` gives one key per line (`stack1`, `stack2`, …). `"default"` gives a single `stack` string. |
| `originalErrorStack` | `boolean` | `true` | Include the original error's stack. |

### `getDebugString(options?)`

Same as `getDebugsObject()` but all values are stringified — useful for structured logging systems that expect `Record<string, string>`.

### `fullMessage()`

Returns `"{name}: {message}"`.

```ts
err.fullMessage(); // "baseError: Failed to load config"
```

## Utility: `stringifyUnknown`

Converts any value to a string. Used internally by `getDebugString()`.

```ts
import { stringifyUnknown } from "@arcscord/better-error";

stringifyUnknown(null);          // "null"
stringifyUnknown("hello");       // '"hello"'
stringifyUnknown({ a: 1 });     // '{"a":1}'
stringifyUnknown(undefined);     // "undefined"
```

## Links

- [API reference](/api?package=better-error)
- [npm package](https://www.npmjs.com/package/@arcscord/better-error)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/better_error)
