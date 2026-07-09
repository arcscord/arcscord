# Ticket bot example

This example is a local Arcscord bot playground for a ticket bot. The bot logic is intentionally minimal; the project is prepared to use Prisma with SQLite so it can run locally without an external database.

Tickets are modeled as Discord threads instead of dedicated channels. The opening modal can fill the `title`, `description`, and optional `category` fields stored on each ticket.

## Install

This folder lives inside the Arcscord monorepo, but it is not a pnpm workspace package. Install dependencies from this directory with `--ignore-workspace`:

```sh
cd examples/ticket_bot
pnpm install --ignore-workspace
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

`DATABASE_URL` points Prisma to a local SQLite file. With the default value, Prisma creates `prisma/dev.db` when you push a schema.

## Prisma

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

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });
```

Useful scripts:

```sh
pnpm db:generate
pnpm db:push
pnpm db:studio
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

## Message stats

A `messageCreate` handler (`src/events/message_count.ts`) counts each
participant's messages in ticket threads (this is why the bot enables the
`GuildMessages` intent). `/ticketstats` (needs `Manage Threads`) reports those
counts as an ephemeral message. It works inside a ticket (defaults to the current
thread) or anywhere else via a `ticket` autocomplete option that searches the
guild's tickets.

## Command stats and the custom result handler

`src/utils/command_result_handler.ts` is wired through
`managers.command.resultHandler` in `src/index.ts`. It runs after every command,
increments the `CommandUsage` row for that command name, and then reproduces the
framework's default logging and error reply.

`/stats` (needs `Manage Server`) reads those counters and replies with a monospace
usage table as an ephemeral message in the current channel.

## Run

```sh
pnpm dev
```
