---
sidebar_position: 1
---

# arcscord

Core framework package for Discord bots. It provides the client, command builders, component builders, event helpers, managers, localization support, and logging utilities.

Links:

- [Documentation](https://arcscord.dev/)
- [API reference](/api?package=arcscord)
- [npm package](https://www.npmjs.com/package/arcscord)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/arcscord)

## Overview

`arcscord` is the main runtime package. It wraps Discord.js with a small framework layer built around typed handlers and manager classes:

| Area | What it provides | Guide |
| --- | --- | --- |
| `ArcClient` | Discord.js client subclass, manager setup, REST command registration, default messages, logging, and localization context. | [Client](/guide/client) |
| Commands | Slash commands, context menu commands, subcommands, autocomplete, command middleware, and result-style command errors. | [Commands](/guide/commands) |
| Events | Typed Discord.js event handlers, readiness behavior, intent diagnostics, and event result handling. | [Events](/guide/events) |
| Middleware | Base command and component middleware classes with `next`, `cancel`, and `error` control flow. | [Middleware](/guide/middleware) |
| Localization | i18next-backed command metadata localization and runtime `ctx.t(...)` helpers. | [Localization](/guide/localization) |
| Logging | Built-in logger utilities and optional diagnostics sink. | [Logger](/guide/logger) |

Most projects only need to import from `arcscord` directly:

```ts
import { ArcClient, createCommand, createEvent } from "arcscord";
```

Use the API reference for exact generated signatures and versioned snapshots.
