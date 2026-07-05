---
sidebar_position: 2
---

# Client

`ArcClient` extends [discord.js `Client`](https://discord.js.org/docs/packages/discord.js/main/Client:Class). All discord.js options, properties, events, and REST methods are available on it.

Porting an existing discord.js bot? See [Migrate from discord.js](/guide/migration/from-discordjs) for side-by-side examples.

## Constructor

```ts
import { ArcClient } from "arcscord";

const client = new ArcClient(token, options);
```

| Parameter | Type | Description |
|---|---|---|
| `token` | `string` | Bot token from the Discord Developer Portal. |
| `options` | `ArcClientOptions` | Client configuration. Extends discord.js `ClientOptions`. |

## Options

### `intents` *(required)*

Gateway intents to enable. Inherited from discord.js. At minimum `"Guilds"` is needed for slash commands.

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
});
```

All discord.js `ClientOptions` (`partials`, `rest`, `presence`, etc.) are also accepted.

---

### `applicationId`

Discord application ID. When provided, `loadCommands` (and `loadHandlers`) can register commands via the REST API before the `clientReady` event fires, without waiting for discord.js to hydrate `client.application`.

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  applicationId: process.env.APPLICATION_ID!,
});
```

---

### `logger`

Controls the built-in logger. All fields are optional.

| Option | Type | Default | Description |
|---|---|---|---|
| `level` | `"trace"` \| `"debug"` \| `"info"` \| `"warn"` \| `"error"` \| `"fatal"` | `"info"` | Minimum level to log. Use `"debug"` to see command/component execution logs during development. |
| `format` | `"pretty"` \| `"json"` | `"pretty"` | Output format. Use `"json"` in production or containers. |
| `loggerFunc` | `(...data: unknown[]) => void` | per-level `console.log`/`console.error` | Custom function to receive each log line. When omitted, warn/error/fatal go to `console.error`, everything else to `console.log`. |
| `customLogger` | `LoggerConstructor` | `ArcLogger` | Replace the built-in logger class entirely. Must satisfy `LoggerInterface`. |
| `diagnostics` | `{ loggerFunc, format? }` | — | Secondary output for full error diagnostics. Providing `loggerFunc` is what turns it on. |
| `errorDetail` | `"short"` \| `"full"` | `"short"` if `diagnostics` is set, `"full"` otherwise | How much detail `logError`/`fatalError` print on the main sink. |

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: process.env.NODE_ENV === "production" ? "json" : "pretty",
  },
});
```

Defaults can also be set via environment variables: `ARCSCORD_LOG_LEVEL`, `LOG_LEVEL`, `ARCSCORD_LOG_FORMAT`, `LOG_FORMAT`.

---

### `enableInternalTrace`

Enables verbose trace logs from framework internals — command dispatch, middleware steps, locale detection, etc. Useful for debugging framework behavior.

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  enableInternalTrace: true,
});
```

Default: `false`.

---

### `baseMessages`

Overrides framework-generated messages sent to users. Currently supports one key:

**`baseMessages.error`** — the message sent when an unhandled error occurs during a command or component handler.

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  baseMessages: {
    error: (id, context) => ({
      content: `An error occurred (id: \`${id}\`). Please contact support.`,
    }),
  },
});
```

The `context` argument contains:
- `context.locale` — the detected i18next language for the interaction (when locale manager is enabled).
- `context.t` — a fixed translation function for that locale.

---

### `managers`

Per-manager configuration. All fields are optional.

| Field | Manages | Documentation |
|---|---|---|
| `managers.command` | Slash, user, and message commands — result handler, dispatch diagnostics | [Result handler](/guide/result-handler) |
| `managers.component` | Buttons, select menus, modals — result handler, dispatch diagnostics | [Result handler](/guide/result-handler) |
| `managers.event` | Discord.js event listeners — intent checks, result handler | [Events](/guide/events) |
| `managers.locale` | i18next integration — language map, detection, resources | [Localization](/guide/localization) |

Example with event intent check configuration:

```ts
const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  managers: {
    event: {
      intentCheck: {
        missing: "warn",       // warn when an event has no matching intent
        partialCoverage: "off",
      },
    },
  },
});
```

## Manager properties

`ArcClient` exposes four manager instances:

| Property | Description |
|---|---|
| `client.commandManager` | Registers commands with Discord and dispatches interactions. |
| `client.componentManager` | Routes component custom IDs and dispatches interactions. |
| `client.eventManager` | Wraps discord.js event listeners with result handling. |
| `client.localeManager` | i18next wrapper used at registration time and per interaction. |

## Methods

### `loadHandlers(handlers)`

Convenience method. Loads commands, components, and events in a single call.

```ts
await client.loadHandlers({
  commands: [avatarCommand, pingCommand],
  components: [simpleButton, profileModal],
  events: [messageEvent],
});
```

If `applicationId` is set, commands are registered immediately over REST without waiting for `clientReady`. Otherwise, `loadHandlers` waits for the client to be ready before pushing commands.

---

### `loadCommands(commands, group?, guild?)`

Registers commands with Discord and loads them into the command manager. Returns `Result<true, InternalError>`.

```ts
const [err] = await client.loadCommands([pingCommand, avatarCommand]);
if (err) {
  client.logger.fatalError(err);
}

// Guild-scoped registration
await client.loadCommands([adminCommand], "admin", process.env.GUILD_ID!);
```

The optional `group` parameter is an internal label for the command set (used by `deleteUnloadedCommands`). The optional `guild` parameter restricts registration to a specific guild.

---

### `loadComponents(components)`

Loads component handlers into the component manager. Returns the number of loaded handlers.

```ts
client.loadComponents([simpleButton, profileModal, roleMenu]);
```

---

### `loadEvents(events)`

Registers event handlers and attaches discord.js listeners. Returns the number of loaded handlers.

```ts
await client.loadEvents([messageEvent, inviteEvent]);
```

---

### `createLogger(name)`

Returns a new logger instance scoped to the given name, using the same output function and configuration as the client logger.

```ts
const log = client.createLogger("my-module");
log.info("started");
```

## Full setup example

```ts title="src/index.ts"
import { ArcClient } from "arcscord";
import { avatarCommand, pingCommand } from "./commands";
import { simpleButton, profileModal } from "./components";
import { messageEvent } from "./events";

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: ["Guilds"],
  applicationId: process.env.APPLICATION_ID,
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: process.env.NODE_ENV === "production" ? "json" : "pretty",
  },
  managers: {
    event: {
      intentCheck: { missing: "warn" },
    },
  },
});

await client.loadHandlers({
  commands: [avatarCommand, pingCommand],
  components: [simpleButton, profileModal],
  events: [messageEvent],
});

void client.login();
```
