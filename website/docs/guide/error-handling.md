---
sidebar_position: 8
---

# Error handling

Arcscord separates errors into two categories:

- **Run errors** — anything that happens inside `run()` or middleware. These
  always reach the `resultHandler`.
- **Dispatch errors** — failures that happen before `run()` can start (command
  not found, option parsing failure, defer error, etc.). These are handled by
  `dispatchDiagnostics`.

## Dispatch diagnostics

Every manager accepts a `dispatchDiagnostics` option that controls how pre-run
failures are logged and whether a reply is sent to the user.

### Command dispatch diagnostics

```ts
import { ArcClient } from "arcscord";

const client = new ArcClient(token, {
  intents: ["Guilds"],
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
  },
});
```

| Key | Default level | Description |
|---|---|---|
| `commandNotFound` | `"error"` | No command matched the interaction |
| `optionParsingFailed` | `"error"` | Option validation failed |
| `contextCreationFailed` | `"error"` | Context object could not be built |
| `deferFailed` | `"warn"` | `deferReply()` threw |
| `autocompleteError` | `"warn"` | Error during autocomplete (no reply possible) |

### Component dispatch diagnostics

```ts
managers: {
  component: {
    dispatchDiagnostics: {
      componentNotFound: { level: "warn", reply: false },
      multipleMatches: { level: "error" },
      contextCreationFailed: { level: "error" },
      deferFailed: { level: "warn", reply: false },
    },
  },
},
```

| Key | Default level | Description |
|---|---|---|
| `componentNotFound` | `"error"` | No route matched the custom ID |
| `multipleMatches` | `"error"` | More than one route matched |
| `contextCreationFailed` | `"error"` | Context object could not be built |
| `deferFailed` | `"warn"` | `deferReply()` threw |

## DiagnosticLevel

Each dispatch case can be set to one of these levels:

| Level | Effect |
|---|---|
| `"ignore"` | Silently ignored — no log, no reply |
| `"debug"` | Logged at debug level |
| `"info"` | Logged at info level |
| `"warn"` | Logged at warning level |
| `"error"` | Error ID generated, logged with `logError` |
| `"throw"` | Error ID generated, rethrown — crashes the process unless caught |

## DispatchErrorConfig

Each dispatch key (except `autocompleteError`) accepts a `DispatchErrorConfig`
object with two optional fields:

```ts
type DispatchErrorConfig = {
  level?: DiagnosticLevel;
  reply?: false | BaseMessageOptions | DispatchReplyFn;
};
```

### `reply`

By default (when `reply` is not set), Arcscord sends an ephemeral reply to the
user using `client.getErrorMessage(id, locale)`. You can:

- Set `reply: false` to suppress the user-facing reply entirely.
- Pass a static `BaseMessageOptions` object to always use the same message.
- Pass a `DispatchReplyFn` for dynamic messages with access to the error and
  locale:

```ts
import type { DispatchReplyFn } from "arcscord";

const notFoundReply: DispatchReplyFn = ({ error, locale, t }) => ({
  content: t("errors.commandNotFound", { id: error.id }),
});

managers: {
  command: {
    dispatchDiagnostics: {
      commandNotFound: {
        level: "warn",
        reply: notFoundReply,
      },
    },
  },
},
```

`DispatchReplyFn` receives a `DispatchMessageContext`:

| Field | Type | Description |
|---|---|---|
| `interaction` | `BaseInteraction` | The Discord.js interaction |
| `error` | `BaseError` | The dispatch error |
| `locale` | `string` | Detected i18next language key |
| `t` | `i18next.t` | Bound translation function for the locale |
| `logger` | `LoggerInterface` | The manager logger |

The function may be async and should return a `BaseMessageOptions`. The reply
is always sent as ephemeral.

## Error flow overview

```
interactionCreate
│
├── locale detection
│
├── route resolution ──── fail ──► dispatchDiagnostics (log + optional reply)
│
├── context creation ──── fail ──► dispatchDiagnostics (log + optional reply)
│
├── deferReply ────────── fail ──► dispatchDiagnostics (log only)
│
├── middleware ─────────── fail ──► resultHandler { status: "thrown" }
│
└── run()
    ├── returned ──────────────────► resultHandler { status: "returned" }
    └── threw ─────────────────────► resultHandler { status: "thrown" }
```

Pre-run failures (anything above `middleware`) always go to
`dispatchDiagnostics`. Once middleware starts, all errors — including middleware
errors — go to `resultHandler`.

## Run errors vs dispatch errors

Use `resultHandler` for everything after `run()` starts:

```ts
import { anyToError } from "@arcscord/error";

resultHandler: (infos) => {
  if (infos.status === "thrown") {
    // unexpected — thrownValue is the raw value, wrap it yourself
    const err = anyToError(infos.thrownValue);
    client.logger.error(`Command threw: ${err.message}`);
    return infos.interaction.reply({
      content: "An unexpected error occurred.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // status === "returned" — infos.result is present
  const [err] = infos.result;
  if (!err) {
    return;
  }

  // expected application error returned by handler
  err.generateId();
  client.logger.warning(`Command failed: ${err.message}`);
  const message = client.getErrorMessage(err.id, infos.locale);
  if (infos.defer) {
    return infos.interaction.editReply(message);
  }
  return infos.interaction.reply({ ...message, flags: MessageFlags.Ephemeral });
},
```

Use `dispatchDiagnostics` for pre-run issues you want to configure without
writing a full handler:

```ts
dispatchDiagnostics: {
  // Treat a missing command as expected (e.g., command was deregistered)
  commandNotFound: { level: "debug", reply: false },
  // Surface option errors to the user with a custom message
  optionParsingFailed: {
    level: "warn",
    reply: ({ t }) => ({ content: t("errors.badOptions") }),
  },
},
```

## Error IDs

Errors that should be surfaced to the user need an ID so the user can report it.
Call `err.generateId()` before logging or sending the ID to the user:

```ts
err.generateId();
client.logger.logError(err); // logs err.id alongside the error
await interaction.reply({ content: `Error ID: ${err.id}`, flags: MessageFlags.Ephemeral });
```

`client.getErrorMessage(id, locale)` does this automatically and returns a
pre-formatted `BaseMessageOptions` using your configured error message template.
