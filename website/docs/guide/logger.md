---
sidebar_position: 7
---

# Logger

The built-in logger (`ArcLogger`) works out of the box with no configuration: `console` output, human-readable in development, JSON in production. Every level accepts an optional structured `meta` object, and the whole thing is swappable — see [Bring your own logger](#bring-your-own-logger) below.

## Pretty vs JSON output

```ts
import { ArcLogger } from "arcscord";

const logger = new ArcLogger("demo");
logger.info("server started");
logger.warn("cache miss, falling back to database");
logger.error("failed to reach the database");
```

`format: "pretty"` (default) — colorized, human-readable:

```
[2026-07-05 20:26:46] demo [INFO]  server started
[2026-07-05 20:26:46] demo [WARN]  cache miss, falling back to database
[2026-07-05 20:26:46] demo [ERROR] failed to reach the database
```

`format: "json"` — one object per line, for log processors:

```json
{"time":"2026-07-05T18:26:46.143Z","level":"info","process":"demo","message":"server started"}
{"time":"2026-07-05T18:26:46.143Z","level":"warn","process":"demo","message":"cache miss, falling back to database"}
```

## Structured fields (`meta`)

Every method on `LoggerInterface` accepts an optional `meta` object as its last argument, so contextual fields don't have to be baked into the message string:

```ts
logger.info("Command executed", {
  command: "ping",
  interactionId: interaction.id,
  guildId: interaction.guildId,
  durationMs: 12,
});
```

In `pretty` format this renders as the message followed by short `key : value` lines. In `json` format the fields are merged under a `meta` key, so log processors can filter/aggregate on them instead of parsing the message text:

```json
{"time":"2026-07-05T18:26:46.143Z","level":"info","process":"demo","message":"Command executed","meta":{"command":"ping","interactionId":"1234567890","guildId":"42","durationMs":12}}
```

## Scoped context with `child()`

`child(bindings)` returns a logger that automatically merges `bindings` into every subsequent call, so you don't have to repeat the same fields (e.g. `interactionId`, `guildId`) on every log line for the duration of a request:

```ts
const requestLogger = client.logger.child({ interactionId: interaction.id, guildId: interaction.guildId });

requestLogger.debug("started");
requestLogger.info("done", { durationMs: 8 }); // meta merges with the bound fields
```

`child` is optional on `LoggerInterface` — a custom logger that doesn't implement it can be omitted, callers should fall back to the original logger: `logger.child?.(bindings) ?? logger`.

## Diagnostics sink

Diagnostics can keep console output readable while sending detailed reports to another sink. Providing `diagnostics` with a `loggerFunc` is what turns it on — there's no separate enabled flag:

```ts
import { ArcClient } from "arcscord";

const diagnostics: string[] = [];

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: [],
  logger: {
    level: "info",
    format: "pretty",
    diagnostics: {
      format: "json",
      loggerFunc: (line) => {
        diagnostics.push(String(line));
      },
    },
  },
});
```

By default, once a diagnostics sink is configured, `logError`/`fatalError` print a short summary (message, error id, type) on the main logger and send the full report — stack trace and cause chain included — to the diagnostics sink instead. Without a diagnostics sink, the main logger keeps the full stack trace, since it would otherwise be lost entirely.

This default is controlled by `errorDetail: "short" | "full"`, which you can set explicitly regardless of whether a diagnostics sink exists — e.g. `errorDetail: "full"` to keep the stack trace directly in the console even while also forwarding full reports to a diagnostics sink, or `errorDetail: "short"` to keep the main sink terse with no diagnostics sink at all.

## Bring your own logger

`ArcClientOptions.logger.customLogger` replaces `ArcLogger` entirely. Any class implementing `LoggerInterface` works — no dependency on a specific logging library is required:

```ts
import type { LoggerInterface } from "arcscord";
```

```ts
type LoggerInterface = {
  trace: (message: string, meta?: DebugValues) => void;
  debug: (message: string | DebugValueString, meta?: DebugValues) => void;
  info: (message: string, meta?: DebugValues) => void;
  warn: (message: string, meta?: DebugValues) => void;
  error: (message: string, meta?: DebugValues) => void;
  logError: (error: unknown | unknown[], meta?: DebugValues) => void;
  fatal: (message: string, meta?: DebugValues) => void;
  fatalError: (error: unknown, meta?: DebugValues) => void;
  log: (level: LogLevel, message: string, meta?: DebugValues) => void;
  child?: (bindings: DebugValues) => LoggerInterface;
};
```

**`fatal`/`fatalError` only log — they never halt execution on their own.** A logger's job is to log, not to decide whether the process should exit. Code that needs to stop after a fatal error has to throw or exit right after calling it, the same way `ArcClient` does internally:

```ts
this.logger.fatalError(err);
throw err; // fatalError() never exits or throws by itself
```

### pino

pino's levels (`trace`/`debug`/`info`/`warn`/`error`/`fatal`) map 1:1 onto `LoggerInterface`. The one thing to watch for: pino takes the fields object *before* the message (`pino.info(fields, msg)`, the reverse of arcscord's `(msg, fields)`).

```ts
import type { LoggerInterface } from "arcscord";
import pino, { type Logger } from "pino";

function adaptPino(instance: Logger): LoggerInterface {
  return {
    trace: (message, meta) => instance.trace(meta ?? {}, message),
    debug: (message, meta) => instance.debug(meta ?? {}, typeof message === "string" ? message : message.join(" : ")),
    info: (message, meta) => instance.info(meta ?? {}, message),
    warn: (message, meta) => instance.warn(meta ?? {}, message),
    error: (message, meta) => instance.error(meta ?? {}, message),
    logError: (error, meta) => instance.error({ err: error, ...meta }, "an error occurred"),
    fatal: (message, meta) => instance.fatal(meta ?? {}, message),
    fatalError: (error, meta) => instance.fatal({ err: error, ...meta }, "a fatal error occurred"),
    log: (level, message, meta) => instance[level](meta ?? {}, message),
    child: bindings => adaptPino(instance.child(bindings)),
  };
}

const client = new ArcClient(process.env.DISCORD_TOKEN!, {
  intents: [],
  logger: {
    customLogger: class PinoLogger implements LoggerInterface {
      #inner: LoggerInterface = adaptPino(pino());

      trace = this.#inner.trace;
      debug = this.#inner.debug;
      info = this.#inner.info;
      warn = this.#inner.warn;
      error = this.#inner.error;
      logError = this.#inner.logError;
      fatal = this.#inner.fatal;
      fatalError = this.#inner.fatalError;
      log = this.#inner.log;
      child = this.#inner.child;
    },
  },
});
```

### winston

winston's npm levels don't include `trace`/`fatal` natively — map `trace` to `debug` and `fatal` to `error`. `meta` goes in the same argument position as arcscord's (`winston.info(message, meta)`). One gotcha: winston's default JSON format serializes a raw `Error` as `{}` (its `message`/`stack` are non-enumerable) unless `winston.format.errors()` is in the chain — serializing explicitly in the adapter works regardless of the caller's format config.

```ts
import type { LoggerInterface } from "arcscord";
import winston from "winston";

function serializeError(error: unknown): unknown {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;
}

function adaptWinston(instance: winston.Logger): LoggerInterface {
  return {
    trace: (message, meta) => instance.debug(message, meta),
    debug: (message, meta) => instance.debug(typeof message === "string" ? message : message.join(" : "), meta),
    info: (message, meta) => instance.info(message, meta),
    warn: (message, meta) => instance.warn(message, meta),
    error: (message, meta) => instance.error(message, meta),
    logError: (error, meta) => instance.error("an error occurred", { err: serializeError(error), ...meta }),
    fatal: (message, meta) => instance.error(message, meta),
    fatalError: (error, meta) => instance.error("a fatal error occurred", { err: serializeError(error), ...meta }),
    log: (level, message, meta) => instance.log(level === "warn" ? "warn" : level === "fatal" || level === "trace" ? "debug" : level, message, meta),
    child: bindings => adaptWinston(instance.child(bindings)),
  };
}
```

### `debug` (npm package)

The `debug` package is namespace-based (gated by the `DEBUG` env var), not severity-based — it's a good fit for `trace`/`debug` only. Keep `console.error`/`console.warn` for `warn`/`error`/`fatal` since `debug` isn't designed to carry that distinction.

```ts
import type { LoggerInterface } from "arcscord";
import createDebug from "debug";

function adaptDebug(namespace: string): LoggerInterface {
  const log = createDebug(namespace);

  return {
    trace: (message, meta) => log(message, meta ?? ""),
    debug: (message, meta) => log(typeof message === "string" ? message : message.join(" : "), meta ?? ""),
    info: (message, meta) => log(message, meta ?? ""),
    warn: (message, meta) => console.warn(message, meta ?? ""),
    error: (message, meta) => console.error(message, meta ?? ""),
    logError: error => console.error(error),
    fatal: (message, meta) => console.error(message, meta ?? ""),
    fatalError: error => console.error(error),
    log: (level, message, meta) => (level === "warn" || level === "error" || level === "fatal" ? console.error : log)(message, meta ?? ""),
  };
}
```

### Reusing the built-in error serialization

Redacting secrets (`token`, `password`, `authorization`, `secret`, `cookie`), truncating large objects, and formatting cause chains is handled by `createErrorReport`/`renderErrorReport`/`renderJsonErrorReport`, exported from `arcscord`. Reuse them in a custom `logError` instead of re-implementing sanitization:

```ts
import { createErrorReport, renderJsonErrorReport } from "arcscord";

logError(error) {
  const report = createErrorReport(error);
  myLogger.error(renderJsonErrorReport(report, "main"));
}
```
