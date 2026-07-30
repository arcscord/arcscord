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
2. `src/handlers.ts` — Arcscord's central registry. It mixes the slash command
   with an `APPLICATION_DEAUTHORIZED` Webhook Event.
3. `src/commands/reminder/index.ts` — defines the user-install `/reminder`
   command and imports one subcommand per file.
4. `src/commands/reminder/create.ts`, `src/commands/reminder/list.ts`, and
   `src/commands/reminder/delete.ts` — each file owns one user action.
5. `src/reminders/database.ts` — opens SQLite, creates the table, and exposes
   small functions for creating, listing, deleting, and finding due reminders.
6. `src/reminders/scheduler.ts` — runs every 30 seconds, fetches due reminders,
   and sends DMs.
7. `src/webhooks/server.ts` — exposes the signed Discord Webhook Events endpoint
   with `node:http`.
8. `src/webhooks/tunnel.ts` — starts a development-only Cloudflare Quick Tunnel
   and prints the Discord endpoint URL.
9. `src/events/application_deauthorized.ts` — removes a user's reminders after
   the user uninstalls the application.
10. `src/reminders/duration.ts` — parses values like `10m`, `1h30m`,
   `2 hours`, and `3 jours`.
11. `src/utils/reply.ts` — builds the shared Components v2 replies used by the
   reminder commands.

## Install

This folder lives inside the Arcscord monorepo, but it has its own small
`pnpm-workspace.yaml` so pnpm can approve the native builds needed by
`better-sqlite3`. Install dependencies from this directory:

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
DISCORD_PUBLIC_KEY=""
```

Optional values:

```env
APPLICATION_ID=""
DATABASE_PATH="./data/reminders.sqlite"
WEBHOOK_HOST="127.0.0.1"
WEBHOOK_PORT=3000
```

`TOKEN` and `DISCORD_PUBLIC_KEY` are required. Copy the public key from the
Discord Developer Portal's **General Information** page; it is not the bot token
or client secret. `WEBHOOK_HOST` defaults to `127.0.0.1` and `WEBHOOK_PORT`
defaults to `3000`.

The loopback default is deliberate: the HTTP server is not reachable from other
devices on the local network and does not require a port-forwarding rule on the
router.

## Test Webhook Events locally

Discord needs a public HTTPS URL, but you should not expose a router port for
local testing. This example supports a
[Cloudflare Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).
`cloudflared` creates an outbound connection, while the bot continues listening
only on `127.0.0.1`.

### 1. Install `cloudflared`

Follow the official
[`cloudflared` installation page](https://developers.cloudflare.com/tunnel/downloads/).
For example, on macOS with Homebrew:

```sh
brew install cloudflared
```

Verify the installation:

```sh
cloudflared --version
```

### 2. Start the bot

In the first terminal:

```sh
pnpm dev
```

Wait until the bot logs its local endpoint:

```text
Discord Webhook Events listening on http://127.0.0.1:3000/discord/webhooks
```

### 3. Start the Quick Tunnel

In a second terminal:

```sh
pnpm tunnel
```

The command reads `WEBHOOK_HOST` and `WEBHOOK_PORT` from `.env`, starts
`cloudflared`, and prints an endpoint similar to:

```text
Discord Webhook Events endpoint:
https://random-words.trycloudflare.com/discord/webhooks
```

Keep both terminals open. A Quick Tunnel URL changes whenever the tunnel is
restarted, so it is intended only for development.

The helper hides `cloudflared`'s verbose internal logs. If the tunnel does not
start and more diagnostics are needed, run:

```sh
WEBHOOK_TUNNEL_DEBUG=1 pnpm tunnel
```

### 4. Configure Discord

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Open the application.
2. Open **Webhooks**.
3. Paste the complete URL printed by `pnpm tunnel` into **Endpoint URL**.
4. Enable Webhook Events.
5. Select **Application Deauthorized**.
6. Save the changes.

Discord sends a signed `PING` while saving the endpoint. The package verifies
the Ed25519 signature and answers with `204`. Discord also sends invalid
signatures periodically; a `401` for those requests is expected.

You can confirm that unsigned traffic is rejected:

```sh
curl -i \
  -X POST \
  -H "content-type: application/json" \
  --data '{}' \
  "https://random-words.trycloudflare.com/discord/webhooks"
```

Replace the hostname with the one printed by `pnpm tunnel`. The response should
be `401`, because the request was not signed by Discord.

### What is exposed?

No inbound router port is opened, and the home public IP is not used as the
Discord endpoint. Cloudflare receives the public request and forwards it over
the outbound tunnel. The example accepts only `/discord/webhooks`; other paths
return `404`, and deliveries without a valid Discord signature are rejected.

Do not place Cloudflare Access authentication in front of this endpoint:
Discord cannot complete an interactive login. Ed25519 verification authenticates
the sender instead.

## Production

Cloudflare Quick Tunnel is documented here only as a development convenience.
Do not use it to run the production endpoint.

For production, deploy the bot and its Webhook Events endpoint to an appropriate
public hosting environment with a stable HTTPS URL. Configure `WEBHOOK_HOST`
according to that platform; use `0.0.0.0` only when its private container network
or reverse proxy requires it, and do not expose the port outside the hosting
environment unnecessarily.

Discord signs the exact request bytes, so the native server preserves the raw
body before passing it to `@arcscord/webhooks`.

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

The same `handlers.events` array can contain Gateway and HTTP-delivered events.
When Discord sends `APPLICATION_DEAUTHORIZED`, the webhook transport verifies
Ed25519, acknowledges the valid delivery with `204`, and dispatches its typed
data through Arcscord. The handler deletes every reminder owned by that user.
HTTP/signature errors stay in the webhook package; database or handler failures
stay in Arcscord's event execution chain.

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

For a temporary public Webhook Events endpoint, keep `pnpm dev` running and use
`pnpm tunnel` in a second terminal.
