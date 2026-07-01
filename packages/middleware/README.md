# @arcscord/middleware

[![npm version](https://badge.fury.io/js/@arcscord%2Fmiddleware.svg)](https://www.npmjs.com/package/@arcscord/middleware)
[![Discord](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

Ready-to-use middleware for [arcscord](https://www.npmjs.com/package/arcscord) command and component handlers.

Provides guards for user allowlists, component author checks, and Discord permissions.

## Install

```sh
pnpm add @arcscord/middleware
```

## Example

```ts
import { CommandBotPermissionMiddleware } from "@arcscord/middleware";
import { createCommand } from "arcscord";

export const pruneCommand = createCommand({
  slash: { name: "prune", description: "Delete recent messages." },
  use: [
    new CommandBotPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `I am missing: ${missingPermissions.join(", ")}`,
    })),
  ],
  run: ctx => ctx.reply("Messages pruned."),
});
```

## Links

- [Documentation](https://arcscord.dev/packages/middleware)
- [API reference](https://arcscord.dev/api?package=middleware)

## License

MIT
