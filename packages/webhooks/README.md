<p align="center">
  <a href="https://arcscord.dev/">
    <img src="https://arcscord.dev/img/brand-wordmark.webp" alt="Arcscord" width="380" />
  </a>
</p>

# @arcscord/webhooks

[![npm version](https://badge.fury.io/js/@arcscord%2Fwebhooks.svg)](https://www.npmjs.com/package/@arcscord/webhooks)
[![Discord](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

Typed handling for [Discord Webhook Events](https://docs.discord.com/developers/events/webhook-events). The package validates Discord's Ed25519 request signature, acknowledges endpoint `PING`s, and can dispatch either to standalone callbacks or Arcscord's multi-source `EventManager`. It never starts a web server.

## Install

```sh
pnpm add @arcscord/webhooks
```

## Arcscord EventManager mode

Webhook Events can live in the same `handlers.events` array as Gateway events. The `source + event` pair determines the arguments passed to `run`:

```ts
import {
  createWebhookHandler,
  webhookEvents,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createEvent } from "arcscord";

export const deauthorized = createEvent({
  source: webhookEvents,
  event: WebhookEventType.ApplicationDeauthorized,
  run: (ctx, data) => {
    ctx.logger.info("Application removed", { userId: data.user.id });
  },
});

const webhooks = createWebhookHandler({
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  dispatch: client.eventManager.dispatcher(webhookEvents),
  onUnknownEvent: delivery => console.warn(delivery.event.type),
});
```

`dispatch` and `handlers` are mutually exclusive. Arcscord handlers receive only the typed `event.data`; the transport envelope and HTTP request stay in this package. A missing handler produces an `unhandled` completion. Expected failures and thrown handler values are normalized by Arcscord's execution chain and do not trigger `onError` a second time.

The standalone callback mode remains available in every HTTP adapter below.

## Officially tested integrations

The package runs integration tests against real framework request pipelines:

| Runtime/API | Officially tested integrations |
| --- | --- |
| Fetch `Request`/`Response` | Next.js App Router, SvelteKit, React Router/Remix, Astro, Cloudflare Workers |
| Fetch-native routers | Hono 4, H3 2 / Nitro 3 |
| Node raw body | Express 5, Fastify 5, Koa 3 |
| Bun | Elysia 1.4 |

Framework dependencies live only in the repository's integration-test workspace. They are not dependencies or peers of the published package.

## Fetch API frameworks

`handleRequest()` accepts a standard Fetch `Request`. Return its `response` immediately, and attach `completion` to the framework's background-task mechanism when one is available:

```ts
import {
  createWebhookHandler,
  WebhookEventType,
} from "@arcscord/webhooks";

const webhooks = createWebhookHandler({
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  handlers: {
    [WebhookEventType.EntitlementCreate]: async (delivery) => {
      await grantEntitlement(delivery.event.data);
    },
  },
  onError: (error, delivery) => {
    console.error(delivery.event.type, error);
  },
});

export async function POST(request: Request): Promise<Response> {
  const { response, completion } = await webhooks.handleRequest(request);
  void completion.then(result => console.log(result.status));
  return response;
}
```

Cloudflare-style runtimes can keep the dispatch alive explicitly:

```ts
const { response, completion } = await webhooks.handleRequest(request);
context.waitUntil(completion);
return response;
```

## Express and other raw-body frameworks

Discord signs the exact unparsed request body. Configure the framework to expose that body, then pass it with the two Discord signature headers:

```ts
app.post("/discord/webhooks", express.raw({ type: "application/json" }), async (request, response) => {
  const result = await webhooks.handleRaw({
    body: request.body,
    signature: request.get("X-Signature-Ed25519"),
    timestamp: request.get("X-Signature-Timestamp"),
  });

  response.status(result.response.status);
  for (const [name, value] of Object.entries(result.response.headers))
    response.setHeader(name, value);

  if (result.response.body === null)
    response.end();
  else
    response.send(result.response.body);

  void result.completion;
});
```

`handleRaw()` accepts a string, `Uint8Array`, or `ArrayBuffer`. Do not pass a parsed JSON object or reserialized body because that changes the signed bytes.

Fastify can preserve the signed bytes with a route-scoped buffer content-type parser:

```ts
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (_request, body, done) => done(null, body),
);
```

## Signed integration-test client

The testing subpath creates a fresh Ed25519 key pair and Discord-shaped signed requests without starting a server:

```ts
import { createWebhookHandler, WebhookEventType } from "@arcscord/webhooks";
import { createWebhookTestClient } from "@arcscord/webhooks/testing";

const discord = await createWebhookTestClient();
const webhooks = createWebhookHandler({
  publicKey: discord.publicKey,
  handlers: {
    [WebhookEventType.QuestUserEnrollment]: () => {},
  },
});

const request = await discord.createEventRequest("https://example.test/webhooks", {
  type: WebhookEventType.QuestUserEnrollment,
  data: undefined,
});
const { response, completion } = await webhooks.handleRequest(request);
```

Use `sendPing()`, `sendEvent()`, or `sendUnknownEvent()` to exercise a listening test server through global `fetch`, or inject another Fetch implementation through `createWebhookTestClient({ fetch })`.

## Dispatch completion

Every request returns a `completion` promise separately from its HTTP response. It always resolves to one of:

- `handled`: the registered known-event callback or `onUnknownEvent` completed;
- `unhandled`: the event was valid but had no callback;
- `failed`: a callback failed; the original error and any `onError` failure are included;
- `not-dispatched`: the request was a `PING` or was rejected.

In Arcscord mode, `handled` means at least one EventManager handler accepted the dispatch. Business failures remain observable through Arcscord's execution handlers and logger. Only a direct dispatcher rejection becomes `failed` in this package.

Signed event names introduced by Discord after this package version still receive `204`. They are passed to `onUnknownEvent` and report `known: false`.

## Supported events

The handler registry covers application authorization, entitlements, Quest enrollment, Lobby Messages, and Game Direct Messages. Each callback receives the complete Discord delivery with its event-specific `data` type inferred from the registry key.

Payload field names remain in Discord's native `snake_case` form.

## Links

- [Documentation](https://arcscord.dev/packages/webhooks)
- [API reference](https://arcscord.dev/api?package=webhooks)
- [Discord Webhook Events](https://docs.discord.com/developers/events/webhook-events)

## License

MIT
