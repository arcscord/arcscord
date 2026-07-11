# @arcscord/better-error

[![npm version](https://badge.fury.io/js/@arcscord%2Fbetter-error.svg)](https://www.npmjs.com/package/@arcscord/better-error)
[![Discord](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

A lightweight extension of the native `Error` class that adds structured debug context. When something goes wrong deep in a call stack, it is often useful to attach extra information — the file that was being processed, the value that caused the issue, the step that failed — without having to encode everything into the error message string.

`BaseError` accepts a `debugs` object alongside the message, keeping diagnostic data structured and inspectable rather than buried in a formatted string. This package remains a standalone utility; the Arcscord framework itself uses its code-based `ArcscordError` type.

## Install

```sh
pnpm add @arcscord/better-error
```

## Example

```ts
import { BaseError } from "@arcscord/better-error";

const error = new BaseError({
  message: "Failed to load config",
  debugs: {
    path: "/etc/bot/config.json",
    reason: "file not found",
  },
});

console.error(error.message); // "Failed to load config"
console.error(error.debugs); // { path: "...", reason: "..." }
```

## Links

- [Documentation](https://arcscord.dev/packages/better-error)
- [API reference](https://arcscord.dev/api?package=better-error)

## License

MIT
