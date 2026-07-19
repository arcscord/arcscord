<p align="center">
  <a href="https://arcscord.dev/">
    <img src="https://arcscord.dev/img/brand-wordmark.webp" alt="Arcscord" width="340" />
  </a>
</p>

# Arcscord examples

Full, runnable bots that show how Arcscord's pieces fit together in a real
project. Each folder is a standalone example with its own README, dependencies,
and `.sample.env` — clone the repo, `cd` into one, and run it.

## The examples

| Example | What it is | What it teaches |
| --- | --- | --- |
| [`starter-bot`](./starter-bot) | The smallest end-to-end bot, right after scaffolding. No database. | Typed slash and context-menu commands, a Components v2 reply with a self-updating button, a component middleware, and a gateway event listener. |
| [`reminder-bot`](./reminder-bot) | A user-install bot that stores personal reminders and DMs you when they are due. | Persistence with SQLite (`better-sqlite3`), a background scheduler, subcommands (`/reminder create\|list\|delete`), and a duration parser. |
| [`ticket_bot`](./ticket_bot) | A complete support-ticket system built on Discord threads. | Prisma + SQLite, i18n (en/fr), modals, buttons, autocomplete, a custom result handler, and command/component middlewares. |

## Suggested reading order

Read them from simplest to most advanced — each one builds on the same
foundation and adds a new layer:

1. **`starter-bot`** — the core primitives, nothing else.
2. **`reminder-bot`** — adds persistence and a background job.
3. **`ticket_bot`** — adds a database schema, localization, and richer flows.

## Running an example

Each example is standalone (it has its own `pnpm-workspace.yaml` and depends on
the published `arcscord` package, not the monorepo source). Install and run from
inside its folder:

```sh
cd examples/<bot>
cp .sample.env .env   # then fill in your bot token
pnpm install
pnpm dev
```

> **Version note.** On the `main` branch the examples pin the **latest
> published** `arcscord` version. For an example that matches a **specific**
> framework version, check out the branch for that version before installing —
> its examples pin the matching `arcscord` release. (CI itself typechecks and
> lints every example against the current repo build via a packed-tarball
> override, so example breakage from framework changes is caught pre-release.)

See each example's own README for its environment variables, required gateway
intents, and database setup.
