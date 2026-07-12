---
sidebar_position: 4
description: Result-style error handling for TypeScript — functions return a Result<T, E> tuple instead of throwing.
---

# @arcscord/error

Result-style error handling for TypeScript, inspired by Go. Instead of throwing exceptions, functions return a `Result<T, E>` tuple: either `[null, value]` on success or `[error, null]` on failure. The caller destructs the tuple and handles the error explicitly — no try/catch, no silent propagation.

This pattern makes error paths visible in function signatures and forces you to handle failures at the call site. It pairs well with TypeScript's discriminated unions: the type of `value` is only accessible when `error` is `null`, so the compiler guides you toward correct handling.

## Install

```sh
pnpm add @arcscord/error
```

## The Result type

```ts
type Result<T, E> = [error: null, value: T] | [error: E, value: null];
```

A `Result` is a 2-tuple. The first element is either `null` (success) or an error. The second element is either the value (success) or `null`. You always destructure both and check the error first with an explicit `!== null` — never a truthy `if (err)`, which would misread a falsy-but-valid error such as `0` or `""` as success.

The error slot is guaranteed to be non-nullish (see [`error`](#errorerr)), so `err !== null` reliably discriminates success from failure.

```ts
import type { Result } from "@arcscord/error";
import { error, ok } from "@arcscord/error";

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return error(new Error("Division by zero"));
  return ok(a / b);
}

const [err, result] = divide(10, 2);
if (err !== null) {
  console.error(err.message);
} else {
  console.log(result); // 5 — TypeScript knows result is number here
}
```

## Functions

### `ok(value)`

Wraps a value in a success Result.

```ts
import { ok } from "@arcscord/error";

return ok(42);        // [null, 42]
return ok(true);      // [null, true]
return ok("done");    // [null, "done"]
```

### `error(err)`

Wraps an error in a failure Result.

```ts
import { error } from "@arcscord/error";

return error(new Error("something went wrong"));   // [Error, null]
return error(new MyCustomError({ message: "..." })); // [MyCustomError, null]
```

`error` **rejects `null` and `undefined`** — an error Result must carry a meaningful value. This is enforced at compile time and at runtime (it throws a `TypeError`), because `[null, null]` would be indistinguishable from a success. Any other value is accepted, including strings, numbers, and plain domain objects:

```ts
return error("failed");                    // [string, null]
return error({ _tag: "TicketLimitReached" }); // [object, null]
```

### `multiple(...callbacks)`

Runs a list of Result-producing callbacks **sequentially** and short-circuits on the first failure. Each callback runs only if every previous one succeeded, so later operations are skipped as soon as one fails or throws. Returns a `Promise`.

```ts
import { multiple, ok } from "@arcscord/error";

const [err, val] = await multiple(
  () => ok("hello"),
  async () => saveUser(user), // only runs if the previous callback succeeded
  () => ok(42),
);
// val is 42 (the last success value)
// err is the first error encountered (or null)
```

Passing callbacks — rather than already-computed Results — is what lets `multiple` skip the remaining work. If a callback throws, the throw is wrapped into `error(anyToError(e))` and the remaining callbacks are not executed.

### `multipleParallel(...callbacks)`

Like [`multiple`](#multiplecallbacks), but runs every callback **in parallel** (think `Promise.all`) and collects **all** success values into a tuple. All callbacks start at once and are awaited — nothing is short-circuited.

```ts
import { multipleParallel } from "@arcscord/error";

const [err, values] = await multipleParallel(
  () => fetchUser(id),
  () => fetchSettings(id),
  () => fetchStats(id),
);
// values is [User, Settings, Stats] (a typed tuple, in callback order)
// err is the first error encountered by position (or null)
```

Choose `multipleParallel` when the operations are independent and you want them running concurrently; choose `multiple` when they must run one after another and later ones should be skipped on the first failure. As with `multiple`, a thrown value is wrapped into `error(anyToError(e))`; every callback still runs to completion, matching `Promise.all` semantics.

### `forceSafe(fn)`

Executes a function and wraps its result in a `Result`, catching any thrown value. Works with both sync and async functions.

```ts
import { forceSafe } from "@arcscord/error";

const [err, data] = await forceSafe(() => JSON.parse(rawInput));
// If JSON.parse throws, err is an Error — no try/catch needed
```

Any non-Error thrown value (string, object, etc.) is converted to an `Error` automatically via `anyToError`.

## Utilities

### `isResult(value)`

Type guard that checks whether a value has the shape of a `Result` tuple. Useful when normalizing a value that may already be a `Result` or may be a raw value.

```ts
import { isResult, ok } from "@arcscord/error";

isResult(ok(42));   // true
isResult(ok(null)); // true — [null, null] is a valid ok(null)
isResult("done");   // false
isResult([1, 2]);   // false — a Result always has at least one null slot
```

### `anyToError(value)`

Converts any value to an `Error` instance. Used internally by `forceSafe`.

```ts
import { anyToError } from "@arcscord/error";

anyToError(new Error("x"));   // Error("x") — returned as-is
anyToError("oops");            // Error("oops")
anyToError({ code: 42 });     // Error('{"code":42}')
anyToError(undefined);         // Error("undefined")
```

## Links

- [API reference](/api?package=error)
- [npm package](https://www.npmjs.com/package/@arcscord/error)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/error)
