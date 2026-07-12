# @arcscord/error

[![npm version](https://badge.fury.io/js/@arcscord%2Ferror.svg)](https://www.npmjs.com/package/@arcscord/error)
[![Discord](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

Result-style error handling for TypeScript, inspired by Go. Instead of throwing exceptions, functions return a `Result<T, E>` tuple: either `[null, value]` on success or `[error, null]` on failure. The caller destructs the tuple and handles the error explicitly — no try/catch, no silent propagation.

This pattern makes error paths visible in function signatures and forces you to handle failures at the call site. It pairs well with TypeScript's discriminated unions: the type of `value` is only accessible when `error` is `null`, so the compiler guides you toward correct handling.

`@arcscord/error` is used by the entire arcscord ecosystem. 

## Install

```sh
pnpm add @arcscord/error
```

## Example

```ts
import type { Result } from "@arcscord/error";
import { error, ok } from "@arcscord/error";

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0)
    return error(new Error("Division by zero"));
  return ok(a / b);
}

const [err, result] = divide(10, 2);
if (err !== null) {
  console.error(err.message);
}
else {
  console.log(result); // 5
}
```

Check the error slot with an explicit `!== null` rather than a truthy `if (err)`. Error values are guaranteed non-nullish — `error(null)` and `error(undefined)` are rejected at compile time and throw at runtime — so `err !== null` reliably distinguishes failure from success, even when the error value is falsy (`0`, `""`).

## Links

- [Documentation](https://arcscord.dev/packages/error)
- [API reference](https://arcscord.dev/api?package=error)

## License

MIT
