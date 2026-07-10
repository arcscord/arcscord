# Starter bot example

This example is the smallest end-to-end Arcscord bot: the kind of project you get
right after scaffolding. It is a guided tour of the framework's core building
blocks rather than a bot that does one specific job.

In a few files it touches a slash command, a context-menu command, a
self-updating button, a component middleware, and a gateway event listener — just
enough of each primitive to see how they fit together.

## Learning path

This folder is meant to be read as a working example, not as a production bot
template. A good reading order is:

1. `src/index.ts` — creates the `ArcClient`, declares the gateway intents, loads
   every handler when Discord says the client is ready, then logs in.
2. `src/handlers.ts` — Arcscord's central registry. Commands, components and
   events become active when they are imported and added to the matching array.
3. `src/commands/ping.ts` — the simplest command: a Components v2 reply with a
   button attached to it.
4. `src/components/ping_button.ts` — the button behind `/ping`. Shows a dynamic
   route param and a self-updating message.
5. `src/middleware/author_only.ts` — a component middleware that restricts the
   refresh button to the user who ran the command.
6. `src/commands/avatar.ts` — one handler exposed as both a slash command and a
   user context-menu command, with option choices and an embed reply.
7. `src/events/react_to_arcscord.ts` — a `messageCreate` listener that reacts to
   messages mentioning "arcscord".

## Install

This folder lives inside the Arcscord monorepo, but it has its own small
`pnpm-workspace.yaml` so pnpm can approve the native build needed by `@swc/core`.
Install dependencies from this directory:

```sh
cd examples/starter-bot
pnpm install
```

## Environment

Create a local `.env` from `.sample.env`:

```sh
cp .sample.env .env
```

Fill in your bot token:

```env
TOKEN=""
```

`index.ts` reads `TOKEN` from the environment at startup. This example does not
use a database, so there is nothing else to configure.

## Intents

The client enables three gateway intents in `src/index.ts`:

- `Guilds` — base guild context.
- `GuildMessages` — delivers the `messageCreate` events used by the reaction
  listener.
- `MessageContent` — a **privileged** intent that lets the listener read
  `message.content`. Enable it in the Discord Developer Portal (Bot → Privileged
  Gateway Intents) or the bot will not receive message text.

The slash and context-menu commands do not need these intents; they are here only
for the `react_to_arcscord` event.

## Commands and lifecycle

- `/ping` — replies with the WebSocket latency in a Components v2 container. The
  reply carries a **Refresh** button; clicking it edits the same message,
  increments a counter carried in the button's `customId`, and only works for the
  user who ran the command (enforced by `AutherOnlyMiddleware`).
- `/avatar [user] [size]` — shows a user's avatar as an embed. The same handler is
  also registered as an **Avatar** entry in the user context menu (right-click a
  member → Apps). Both are available to user installs and guild installs.

Alongside the commands, the `reactToArcscord` event reacts with 🚀 to any message
that mentions "arcscord".

## Extending the example

### Add a slash command

1. Create `src/commands/my_command.ts`.
2. Export a `createCommand(...)` handler.
3. Import the command in `src/handlers.ts` and add it to the `commands` array.
4. Run `pnpm typecheck`.

### Add a component

1. Create the component in `src/components`.
2. Give it a stable `route`; that route is the static `customId` for simple
   buttons, or the route pattern (with `{param}` segments) for dynamic ids.
3. Add any middleware it needs to `use: []`.
4. Import the component in `src/handlers.ts` and add it to the `components` array.
5. Build the component from a command or shared helper.
6. Run `pnpm typecheck`.

### Add an event

1. Create the listener in `src/events` with `createEvent(...)`.
2. If it reads new gateway data, add the matching intent in `src/index.ts`.
3. Import the event in `src/handlers.ts` and add it to the `events` array.
4. Run `pnpm typecheck`.

## Not production-ready on purpose

This example keeps the moving parts small. It shows Arcscord patterns first:
handlers, typed commands, context-menu commands, Components v2 replies, dynamic
component routes, a component middleware, and a gateway event listener.

It is a starting point, not a finished bot. A real project would typically add
persistence, localization, richer permission handling, and tests — all of which
the [reminder bot](../reminder-bot) and [ticket bot](../ticket_bot) examples
demonstrate on top of the same foundation.

## Run

```sh
pnpm typecheck
pnpm lint
pnpm dev
```
