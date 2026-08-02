---
description: Receive, verify, acknowledge, and dispatch typed Discord Webhook Events in any web framework.
keywords:
  - discord webhook events
  - discord webhooks
  - ed25519
  - typescript
  - arcscord webhooks
---

# @arcscord/webhooks

`@arcscord/webhooks` receives [Discord Webhook Events](https://docs.discord.com/developers/events/webhook-events) without owning your HTTP server. It validates Ed25519 signatures against the exact raw body, acknowledges Discord endpoint checks, and dispatches either to Arcscord's multi-source EventManager or event-specific standalone callbacks.

- [API reference](/api?package=webhooks)
- [npm package](https://www.npmjs.com/package/@arcscord/webhooks)
- [Source](https://github.com/arcscord/arcscord/tree/main/packages/webhooks)

The HTTP layer does not depend on Express, Fastify, Next.js, or another server framework.

## Install

```sh
pnpm add @arcscord/webhooks
```

Standalone callbacks do not require Arcscord. To dispatch through Arcscord's
`EventManager`, install Arcscord 1.2 or newer as well:

```sh
pnpm add @arcscord/webhooks arcscord
```

Copy the application public key from the Discord Developer Portal. Do not use the bot token or client secret:

```env
DISCORD_PUBLIC_KEY=your_application_public_key
```

## Test locally without opening a router port

Discord requires a public Webhook Events URL. For local development, an
outbound-only [Cloudflare Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
can forward a temporary HTTPS URL to a server bound to the loopback interface:

```sh
cloudflared tunnel --url http://127.0.0.1:3000
```

Configure Discord with the generated hostname plus your application route:

```text
https://random-words.trycloudflare.com/discord/webhooks
```

No router port-forwarding rule is needed. Keep the local server bound to
`127.0.0.1`, preserve its raw request body, and continue validating every
Ed25519 signature. Do not enable interactive Cloudflare Access authentication
for this route because Discord cannot complete an Access login.

Quick Tunnel hostnames change when restarted and are intended only for
development. Do not use a Quick Tunnel for production. Deploy the endpoint to
an appropriate public hosting environment with a stable HTTPS URL instead. The
repository's reminder bot example provides a `pnpm tunnel` development helper
that prints the complete URL to paste into Discord.

## Use Arcscord event handlers

`webhookEvents` is a typed event source. Handlers use the normal `createEvent` API and can be mixed with Gateway handlers:

```ts
import {
  createWebhookHandler,
  webhookEvents,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createEvent } from "arcscord";

export const applicationDeauthorized = createEvent({
  source: webhookEvents,
  event: WebhookEventType.ApplicationDeauthorized,
  run: (ctx, data) => {
    ctx.logger.info("Application deauthorized", { userId: data.user.id });
  },
});

export const webhooks = createWebhookHandler({
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  dispatch: client.eventManager.dispatcher(webhookEvents),
  onUnknownEvent: delivery => console.warn(delivery.event.type),
});
```

The handler receives the event-specific `data` object. `ctx.source` is `webhookEvents`, `ctx.event` is the precise event name, and `ctx.client` remains the owning `ArcClient`.

`handlers` and `dispatch` are mutually exclusive. With `dispatch`, no registered EventManager handler produces `unhandled`. A direct dispatcher rejection produces `failed` and calls `onError`. `ctx.error()`, exceptions from `run`, and execution-handler failures stay in Arcscord's execution chain and are not reported twice.

## Official HTTP support matrix

Every contract or integration in this table is executed in the repository test suite with a real signed Ed25519 request. “Fetch contract” means the framework-facing function passes the standard `Request` through and returns the resulting `Response`; “framework integration” additionally executes that framework's router or raw-body parser.

| Framework/runtime | Tested API | Coverage |
| --- | --- | --- |
| Next.js App Router | `POST(request: Request)` | Fetch contract |
| SvelteKit | `POST({ request })` | Fetch contract |
| React Router / Remix | `action({ request })` | Fetch contract |
| Astro | `POST({ request })` | Fetch contract |
| Cloudflare Workers | `fetch(request)` and `waitUntil()` | Fetch contract |
| Hono 4 | `context.req.raw` and `app.request()` | Framework integration |
| H3 2 / Nitro 3 | `fromWebHandler()` and `app.request()` | Framework integration |
| Express 5 | `express.raw()` | Framework integration |
| Fastify 5 | buffer content-type parser | Framework integration |
| Koa 3 | unparsed Node request stream | Framework integration |
| Elysia 1.4 on Bun | `request` and `app.handle()` | Framework integration |

The package remains independent of these HTTP frameworks: none is a dependency or peer dependency of `@arcscord/webhooks`. Arcscord is an optional peer used only when an application connects `webhookEvents` to its `EventManager`.

## Standalone typed callbacks

Without an ArcClient, the event name used as each registry key determines the exact type of `delivery.event.data`:

```ts
import {
  createWebhookHandler,
  WebhookEventType,
} from "@arcscord/webhooks";

export const webhooks = createWebhookHandler({
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  handlers: {
    [WebhookEventType.ApplicationAuthorized]: async (delivery) => {
      console.log(delivery.event.data.user.id);
      console.log(delivery.event.data.scopes);
    },
    [WebhookEventType.EntitlementCreate]: async (delivery) => {
      await grantEntitlement(delivery.event.data);
    },
    [WebhookEventType.LobbyMessageDelete]: async (delivery) => {
      await removeLobbyMessage(
        delivery.event.data.lobby_id,
        delivery.event.data.id,
      );
    },
  },
  onUnknownEvent: (delivery) => {
    console.warn("New Discord event:", delivery.event.type);
  },
  onError: (error, delivery) => {
    console.error(`Webhook handler failed: ${delivery.event.type}`, error);
  },
});
```

Payload properties stay in Discord's native `snake_case` form. The complete outer delivery remains available so handlers can read `application_id`, the event timestamp, and the event data together.

## Fetch Request and Response

Use `handleRequest()` in frameworks based on the Fetch API, including Next.js route handlers, Hono, and Bun:

`handleRequest()` limits request bodies to 1 MiB. It rejects larger bodies with
`413` before signature verification, using `Content-Length` when available and
enforcing the same limit while reading streamed bodies.

```ts title="app/api/discord-webhooks/route.ts"
import type { WebhookDispatchResult } from "@arcscord/webhooks";
import { webhooks } from "./webhooks";

function observe(result: WebhookDispatchResult): void {
  if (result.status === "failed")
    console.error(result.eventType, result.error);
}

export async function POST(request: Request): Promise<Response> {
  const { response, completion } = await webhooks.handleRequest(request);

  void completion.then(observe);
  return response;
}
```

`response` is ready after method, signature, and envelope validation. The event callback is not awaited before the `204` acknowledgement is returned.

On a runtime with an execution-context API, keep the background work alive explicitly:

```ts
const { response, completion } = await webhooks.handleRequest(request);
context.waitUntil(completion);
return response;
```

### Hono

Hono exposes the untouched standard request as `context.req.raw`:

```ts
app.post("/discord/webhooks", async (context) => {
  const { response, completion } = await webhooks.handleRequest(context.req.raw);
  void completion.then(observe);
  return response;
});
```

H3 v2 uses the same Fetch handler through `fromWebHandler()`. Elysia passes its route `request` directly to `handleRequest()`.

## Raw-body frameworks

### Express

Discord signs the timestamp followed by the exact request bytes. Configure Express to preserve those bytes for this route:

```ts
import express from "express";
import { webhooks } from "./webhooks";

const app = express();

app.post(
  "/discord/webhooks",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const { response: acknowledgement, completion } = await webhooks.handleRaw({
      body: request.body,
      signature: request.get("X-Signature-Ed25519"),
      timestamp: request.get("X-Signature-Timestamp"),
    });

    response.status(acknowledgement.status);
    for (const [name, value] of Object.entries(acknowledgement.headers))
      response.setHeader(name, value);

    if (acknowledgement.body === null)
      response.end();
    else
      response.send(acknowledgement.body);

    void completion;
  },
);
```

Do not run `express.json()` before this route. A parsed and reserialized object is not the body Discord signed.

### Fastify

Install a buffer parser before the webhook route, then use the same `handleRaw()` mapping as Express:

```ts
fastify.removeContentTypeParser("application/json");
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (_request, body, done) => done(null, body),
);
```

Pass `request.body` and the two signature headers to `handleRaw()`. If the application has other JSON routes, register this parser inside an encapsulated Fastify plugin so it only affects the webhook route.

### Koa

Koa leaves the incoming Node stream unparsed until body middleware consumes it. Read that stream into a `Buffer` for `handleRaw()` and write the returned status, headers, and body to `context.res`. Set `context.respond = false` when preserving the handler's headers on an empty `204`.

`handleRaw()` accepts a `Buffer` through its `Uint8Array` compatibility, as well as a string or `ArrayBuffer`.

## Signed test client

`@arcscord/webhooks/testing` provides a small Discord-like Fetch client. It generates a fresh Ed25519 key pair, exposes only the public key, creates protocol-shaped payloads, and signs the exact timestamp plus JSON body:

```ts
import {
  createWebhookHandler,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createWebhookTestClient } from "@arcscord/webhooks/testing";

const discord = await createWebhookTestClient({
  applicationId: "123456789012345678",
});
const webhooks = createWebhookHandler({
  publicKey: discord.publicKey,
  handlers: {
    [WebhookEventType.QuestUserEnrollment]: () => {},
  },
});

const request = await discord.createEventRequest(
  "https://example.test/discord/webhooks",
  {
    type: WebhookEventType.QuestUserEnrollment,
    data: undefined,
  },
);

const { response, completion } = await webhooks.handleRequest(request);
```

The event key precisely determines the accepted `data` type. The client also exposes:

- `createPingRequest()`, `createUnknownEventRequest()`, and generic `createRequest()` for framework injection;
- `sendPing()`, `sendEvent()`, `sendUnknownEvent()`, and `send()` for a listening server;
- `createWebhookTestClient({ fetch })` to inject `app.request`, `app.handle`, a worker fetch function, or another test transport.

This subpath is a test utility. It never starts a server and keeps the generated private key internal.

## HTTP behavior

| Request | Response | Dispatch |
| --- | --- | --- |
| Method other than POST | `405` | `not-dispatched` |
| Missing or invalid signature | `401` | `not-dispatched` |
| Signed invalid JSON or envelope | `400` | `not-dispatched` |
| Signed Discord `PING` | Empty `204` | `not-dispatched` with reason `ping` |
| Signed known event | Empty `204` | Registered typed handler, or `unhandled` |
| Signed future event name | Empty `204` | `onUnknownEvent`, or `unhandled`, with `known: false` |

All responses include `Content-Type: application/json; charset=utf-8`. A `405` also includes `Allow: POST`.

## Completion results

The HTTP acknowledgement and callback completion are intentionally separate:

```ts
const { response, completion } = await webhooks.handleRequest(request);

completion.then((result) => {
  switch (result.status) {
    case "handled":
      console.log("Handled", result.eventType, result.known);
      break;
    case "unhandled":
      console.warn("No handler", result.eventType, result.known);
      break;
    case "failed":
      console.error(result.eventType, result.error);
      break;
    case "not-dispatched":
      console.log(result.reason);
      break;
  }
});

return response;
```

`completion` always resolves. A failed event callback becomes `failed` and is also passed to `onError`. If `onError` throws, that secondary failure is available as `errorHandlerError`.

## Supported event names

| Family | Events |
| --- | --- |
| Application | `APPLICATION_AUTHORIZED`, `APPLICATION_DEAUTHORIZED` |
| Entitlement | `ENTITLEMENT_CREATE`, `ENTITLEMENT_UPDATE`, `ENTITLEMENT_DELETE` |
| Quest | `QUEST_USER_ENROLLMENT` |
| Lobby Message | `LOBBY_MESSAGE_CREATE`, `LOBBY_MESSAGE_UPDATE`, `LOBBY_MESSAGE_DELETE` |
| Game Direct Message | `GAME_DIRECT_MESSAGE_CREATE`, `GAME_DIRECT_MESSAGE_UPDATE`, `GAME_DIRECT_MESSAGE_DELETE` |

Discord currently documents Quest enrollment but does not make it receivable by applications. It remains typed so the registry matches the Developer Portal and protocol documentation.

## Lower-level signature verification

Use the configured verifier when a framework needs a custom parsing pipeline:

```ts
const valid = await webhooks.verifyWebhookSignature({
  body: rawBody,
  signature,
  timestamp,
});
```

The standalone `verifyWebhookSignature({ publicKey, body, signature, timestamp })` export provides the same verification without creating a handler. Malformed request signatures return `false`; malformed configured public keys throw a `TypeError`.
