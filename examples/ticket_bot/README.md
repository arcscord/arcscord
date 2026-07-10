# Ticket bot example

This example is a local Arcscord bot playground for a ticket bot. The bot logic is intentionally minimal; the project is prepared to use Prisma with SQLite so it can run locally without an external database.

Tickets are modeled as Discord threads instead of dedicated channels. The opening modal can fill the `title`, `description`, and optional `category` fields stored on each ticket.

## Learning path

This folder is meant to be read as a working example, not as a production bot
template. A good reading order is:

1. `src/index.ts` — creates `ArcClient`, configures intents, i18n, command result
   handling, then loads every handler before login.
2. `src/handlers.ts` — the central registry loaded by Arcscord. New commands,
   components and events become active when they are imported and added here.
3. `src/commands/setup.ts`, `src/components/open_ticket.ts` and
   `src/components/open_modal.ts` — the dashboard button, modal flow, thread
   creation and first ticket message.
4. `src/middleware/in_ticket.ts` — shared command/component middleware that
   resolves the ticket for the current thread and exposes it as
   `ctx.additional.inTicket`.
5. `src/utils/ticket_actions.ts` — shared ticket lifecycle logic used by both
   slash commands and buttons.
6. `src/events/message_count.ts` and `src/commands/ticket_stats.ts` — an event
   handler, a Prisma counter and an autocomplete command option.
7. `src/utils/command_result_handler.ts` and `src/commands/stats.ts` — replacing
   the command result handler while preserving the default error behaviour.

## Install

This folder lives inside the Arcscord monorepo, but it has its own small
`pnpm-workspace.yaml` so pnpm can approve the native builds needed by Prisma,
`better-sqlite3` and `@swc/core`. Install dependencies from this directory:

```sh
cd examples/ticket_bot
pnpm install
```

If pnpm reports an unexpected store location from an existing `node_modules`, reinstall the example dependencies after removing that local `node_modules` directory.

## Environment

Create a local `.env` from `.sample.env` and fill in the Discord values:

```sh
cp .sample.env .env
```

Required values:

```env
TOKEN=""
APPLICATION_ID=""
DATABASE_URL="file:./prisma/dev.db"
```

`src/utils/env.ts` reads these values at startup and throws a clear error if one
is missing. `DATABASE_URL` points Prisma to a local SQLite file. With the default
value, Prisma creates `prisma/dev.db` when you push a schema.

## Database

The project includes a SQLite Prisma schema at `prisma/schema.prisma` and a Prisma 7 config at `prisma.config.ts`.

The base schema contains:

- `Ticket`: one Discord thread ticket, including the opener, thread ID, modal fields, status, and close metadata.
- `TicketEvent`: a lightweight audit trail for creation, claim, close, reopen, and notes.
- `TicketParticipant`: one row per user seen in a ticket thread; holds the message count (read by `/ticketstats`) and a `removed` flag for members taken out of the thread on close.
- `CommandUsage`: a global per-command counter, incremented by the custom command result handler and read back by `/stats`.

After changing the schema, run:

```sh
pnpm db:generate
pnpm db:push
```

The generated Prisma Client is written to `src/generated/prisma`.

When you wire the bot to the database, instantiate the client with the SQLite adapter:

```ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";
import { readRequiredEnv } from "./utils/env";

const adapter = new PrismaBetterSqlite3({
  url: readRequiredEnv("DATABASE_URL"),
});

export const prisma = new PrismaClient({ adapter });
```

Useful scripts:

```sh
pnpm db:generate
pnpm db:push
pnpm db:studio
pnpm typecheck
```

## Commands and lifecycle

The `/setup` command (needs `Manage Server`) posts a dashboard with an
**Open a ticket** button. Opening a ticket fills a modal and creates a private
thread with **Claim** and **Close** buttons.

Managing a ticket needs the `Manage Threads` permission. Inside a ticket thread,
staff can drive the lifecycle either with the buttons or with the slash commands,
which share the same logic:

- `/claim` — take charge of the ticket.
- `/close [reason]` — close the ticket; the announcement includes a **Reopen** button.
- `/reopen` — reopen a closed ticket.

On close, members without `Manage Threads` (typically the opener) are removed from
the thread so a closed ticket is staff-only; `/reopen` adds them back. The removed
members are tracked with the `removed` flag on `TicketParticipant`.

The middleware lives in `src/middleware/in_ticket.ts` and comes in two flavours
sharing one lookup:

- `InTicketMiddleware` (a command middleware, used by `/claim`, `/close`, `/reopen`);
- `InTicketComponentMiddleware` (a component middleware, used by the Claim/Close/Reopen buttons).

Both resolve the current thread's ticket and expose it as `ctx.additional.inTicket`,
rejecting the interaction when it is used outside a ticket thread.

Discord enforces `defaultMemberPermissions` on the slash commands, but buttons
have no such gate, so the Claim/Close/Reopen buttons additionally use
`ComponentMemberPermissionMiddleware` from
[`@arcscord/middleware`](../../packages/middleware) to require `Manage Threads`.
It checks `interaction.memberPermissions`, which Discord computes for the thread
from its parent channel — a parent-channel-level check that honours per-channel
permission overwrites (the same rule used when removing members on close).

### Message stats

A `messageCreate` handler (`src/events/message_count.ts`) counts each
participant's messages in ticket threads (this is why the bot enables the
`GuildMessages` intent). `/ticketstats` (needs `Manage Threads`) reports those
counts as an ephemeral message. It works inside a ticket (defaults to the current
thread) or anywhere else via a `ticket` autocomplete option that searches the
guild's tickets.

### Command stats and the custom result handler

`src/utils/command_result_handler.ts` is wired through
`managers.command.resultHandler` in `src/index.ts`. It runs after every command,
increments the `CommandUsage` row for that command name, and then reproduces the
framework's default logging and error reply.

`/stats` (needs `Manage Server`) reads those counters and replies with a monospace
usage table as an ephemeral message in the current channel.

## Extending the example

### Add a slash command

1. Create `src/commands/my_command.ts`.
2. Export a `createCommand(...)` handler.
3. Add localized command names/descriptions to `locales/en.json` and `locales/fr.json`.
4. Import the command in `src/handlers.ts` and add it to the `commands` array.
5. Run `pnpm typecheck`.

### Add a button or modal

1. Create the component in `src/components`.
2. Give it a stable `route`; that route is the static `customId` for simple
   buttons, or the route pattern for dynamic ids.
3. If the component only works inside ticket threads, add
   `new InTicketComponentMiddleware()` to `use`.
4. Import the component in `src/handlers.ts` and add it to the `components` array.
5. Build the component from a command, modal or shared helper.

### Add ticket data

1. Edit `prisma/schema.prisma`.
2. Run `pnpm db:generate` and `pnpm db:push`.
3. Update the Prisma reads/writes near the feature that owns the data.
4. Update the locales and README if the user-facing workflow changes.

## Not production-ready on purpose

This example deliberately stays small. It shows Arcscord patterns first:
handlers, typed commands, components, modals, middleware, i18n, result handling
and a simple Prisma integration.

It does not try to solve every production ticket-system concern. For a real bot,
you would likely add:

- robust transcript/export logic;
- stricter operational logging and monitoring;
- role/channel configuration stored per guild;
- migration/deployment workflows for the database;
- richer permission policies and audit views;
- cleanup jobs for old tickets and archived threads;
- tests around the ticket lifecycle helpers.

Those are good extensions, but they are intentionally outside the core teaching
surface of this example.

## Run

```sh
pnpm typecheck
pnpm dev
```
