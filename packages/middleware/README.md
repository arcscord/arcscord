# @arcscord/middleware

[![npm version](https://badge.fury.io/js/@arcscord%2Fmiddleware.svg)](https://www.npmjs.com/package/@arcscord/middleware)
[![Discord](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

Ready-to-use middleware for [arcscord](https://www.npmjs.com/package/arcscord) command and component handlers.

Provides guards for cooldowns, user allowlists, component author checks, and Discord permissions.

## Install

```sh
pnpm add @arcscord/middleware
```

## Example

```ts
import { CooldownMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

export const pingCommand = createCommand({
  build: {
    slash: { name: "ping", description: "Reply with pong." },
  },
  use: [
    new CooldownMiddleware(10, ({ cooldownRemaining }) => ({
      content: `Wait ${Math.ceil(cooldownRemaining / 1000)}s before using this command again.`,
    })),
  ],
  run: ctx => ctx.reply("Pong!"),
});
```

## Links

- [Documentation](https://arcscord.dev/packages/middleware)
- [API reference](https://arcscord.dev/api?package=middleware)

## License

MIT
