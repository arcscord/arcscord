# Reminder bot example

This example is a small Arcscord bot that lets a user create personal reminders.
It is intentionally built as a **user-install only** app: the slash command is
registered with `integrationTypes: ["userInstall"]`, so the command belongs to
the user installation flow instead of a server installation flow.

The bot stores reminders in a local SQLite database with `better-sqlite3`. Every
30 seconds it checks for due reminders, sends the message in DM, then removes the
row from the database. If the DM cannot be sent, the example logs the error and
still removes the reminder to keep the behavior simple.

## Learning path

This folder is meant to be read as a working example, not as a production bot
template. A good reading order is:

1. `src/index.ts` — creates the `ArcClient`, loads handlers, and starts the
   reminder scheduler when Discord says the client is ready.
2. `src/handlers.ts` — Arcscord's central registry. The example has one slash
   command and no components or events.
3. `src/commands/reminder/index.ts` — defines the user-install `/reminder`
   command and imports one subcommand per file.
4. `src/commands/reminder/create.ts`, `src/commands/reminder/list.ts`, and
   `src/commands/reminder/delete.ts` — each file owns one user action.
5. `src/reminders/database.ts` — opens SQLite, creates the table, and exposes
   small functions for creating, listing, deleting, and finding due reminders.
6. `src/reminders/scheduler.ts` — runs every 30 seconds, fetches due reminders,
   and sends DMs.
7. `src/reminders/duration.ts` — parses values like `10m`, `1h30m`,
   `2 hours`, and `3 jours`.
8. `src/utils/reply.ts` — builds the shared Components v2 replies used by the
   reminder commands.

## Install

This folder lives inside the Arcscord monorepo, but it has its own small
`pnpm-workspace.yaml` so pnpm can approve the native builds needed by
`better-sqlite3` and `@swc/core`. Install dependencies from this directory:

```sh
cd examples/reminder-bot
pnpm install
```

## Environment

Create a local `.env` from `.sample.env`:

```sh
cp .sample.env .env
```

Fill in at least:

```env
TOKEN=""
```

Optional values:

```env
APPLICATION_ID=""
DATABASE_PATH="./data/reminders.sqlite"
```

`src/utils/env.ts` reads `TOKEN` at startup and throws a clear error if it is
missing. `DATABASE_PATH` points to the SQLite file. If it is missing, the bot
uses `./data/reminders.sqlite`.

## Database

SQLite is a good teaching database for this bot because there is only one process
and the data model is tiny.

The `reminders` table contains:

- `id`: the reminder id shown by `/reminder list`;
- `user_id`: the Discord user that owns the reminder;
- `message`: the text sent back in DM;
- `remind_at`: the due timestamp used by the scheduler;
- `created_at`: the creation timestamp.

The table and indexes are created automatically at startup, so there is no
migration step for this minimal example.

## Commands and lifecycle

The `/reminder` command is available to user installs and can be used from a
server, a bot DM, or another private channel.

- `/reminder create delay message` — creates a reminder for the current user.
- `/reminder list` — shows that user's pending reminders.
- `/reminder delete id` — removes one reminder.

The `delay` option accepts compact or readable relative values:

- `10m` for 10 minutes;
- `90min` for 90 minutes;
- `1h30m` or `1 h 30 min` for 1 hour and 30 minutes;
- `2 hours` for 2 hours;
- `2h` for 2 hours;
- `3d` or `3 jours` for 3 days;
- `1d 4h 15m` for 1 day, 4 hours and 15 minutes.

For readability, this example accepts delays from 1 minute to 30 days.

After creation, the scheduler checks the database every 30 seconds. When a
reminder is due, the bot fetches the user, sends a DM, then deletes the reminder.
If the user has closed their DMs, the error is logged and the reminder is still
deleted to keep this example simple.

## Extending the example

### Add a slash subcommand

1. Create `src/commands/reminder/my_action.ts`.
2. Export a `createSubCommand(...)` handler.
3. Import the subcommand in `src/commands/reminder/index.ts`.
4. Add it to the `subCommands` array.
5. Run `pnpm typecheck`.

### Add a component

1. Create the component in `src/components`.
2. Give it a stable `route`; that route is the static `customId` for simple
   buttons, or the route pattern for dynamic ids.
3. Import the component in `src/handlers.ts` and add it to the `components` array.
4. Build the component from a command or shared helper.
5. Run `pnpm typecheck`.

### Add reminder data

1. Edit the schema in `src/reminders/database.ts`.
2. Update the insert/select/delete helpers near the schema.
3. Update the commands or scheduler that own the new field.
4. Update this README if the user-facing workflow changes.

## Not production-ready on purpose

This example keeps the moving parts small. It shows Arcscord patterns first:
handlers, typed commands, Components v2 replies, user-install command metadata,
SQLite persistence and a simple scheduler.

It does not try to solve every production reminder-system concern. For a real
bot, you would likely add:

- migrations;
- retry logic and failure states for failed DMs;
- pagination for long reminder lists;
- time zones and absolute dates;
- background job locking for multi-process deployments;
- monitoring and operational logs;
- tests around the scheduler and duration parser.

Those are good extensions, but they are intentionally outside the core teaching
surface of this example.

## Run

```sh
pnpm typecheck
pnpm lint
pnpm dev
```
