# arcscord

[![npm version](https://badge.fury.io/js/arcscord.svg)](https://www.npmjs.com/package/arcscord)
[![Discord](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

Arcscord is a TypeScript framework for building Discord bots on top of Discord.js. It wraps the Discord.js client with a structured layer of typed handlers, managers, and middleware, so you can focus on bot logic instead of wiring boilerplate.

Commands, components (buttons, selects, modals), and events are each declared as self-contained objects with a declarative definition and a `run` handler. The framework resolves incoming interactions to the right handler, creates a typed context, runs any middleware in order, and calls your handler — no manual routing needed.

Arcscord also includes optional localization via i18next, a built-in logger with diagnostics support, and result-style error handling through `@arcscord/error` so failures are always explicit and typed.

## Install

```sh
pnpm add arcscord
```

## Example

```ts
import { ArcClient, createCommand, createEvent } from "arcscord";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds", "GuildMessages"],
});

const pingCommand = createCommand({
  slash: { name: "ping", description: "Reply with pong." },
  run: ctx => ctx.reply("Pong!"),
});

await client.login();
await client.waitReady();
await client.loadCommands([pingCommand]);
```

## Links

- [Documentation](https://arcscord.dev/)
- [API reference](https://arcscord.dev/api?package=arcscord)

## License

MIT
