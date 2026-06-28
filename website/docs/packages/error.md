---
sidebar_position: 4
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

A `Result` is a 2-tuple. The first element is either `null` (success) or an error. The second element is either the value (success) or `null`. You always destructure both and check the error first.

```ts
import type { Result } from "@arcscord/error";
import { error, ok } from "@arcscord/error";

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return error(new Error("Division by zero"));
  return ok(a / b);
}

const [err, result] = divide(10, 2);
if (err) {
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

### `multiple(...results)`

Checks multiple Results at once. Returns the last success value if all succeed, or the first error encountered.

```ts
import { multiple, ok, error } from "@arcscord/error";

const a: Result<string, Error> = ok("hello");
const b: Result<number, TypeError> = ok(42);

const [err, val] = multiple(a, b);
// val is 42 (the last success value)
// err is Error | TypeError
```

Useful when you need to run several operations and fail fast on the first error.

### `forceSafe(fn)`

Executes a function and wraps its result in a `Result`, catching any thrown value. Works with both sync and async functions.

```ts
import { forceSafe } from "@arcscord/error";

const [err, data] = await forceSafe(() => JSON.parse(rawInput));
// If JSON.parse throws, err is an Error — no try/catch needed
```

Any non-Error thrown value (string, object, etc.) is converted to an `Error` automatically via `anyToError`.

## Utilities

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
