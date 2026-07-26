<p align="center">
  <a href="https://arcscord.dev/">
    <img src="https://arcscord.dev/img/brand-wordmark.webp" alt="Arcscord" width="380" />
  </a>
</p>

# @arcscord/webhooks

[![npm version](https://badge.fury.io/js/@arcscord%2Fwebhooks.svg)](https://www.npmjs.com/package/@arcscord/webhooks)
[![Discord](https://discord.com/api/guilds/1012097557532528791/widget.png?style=shield)](https://discord.gg/4geBanVWGR)

Framework-agnostic, typed handling for [Discord Webhook Events](https://docs.discord.com/developers/events/webhook-events). The package validates Discord's Ed25519 request signature, acknowledges endpoint `PING`s, dispatches typed event callbacks, and never starts a web server.

It works on its own and has no dependency on `arcscord` or `discord.js`.

## Install

```sh
pnpm add @arcscord/webhooks
```

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

  for (const [name, value] of Object.entries(result.response.headers))
    response.setHeader(name, value);

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

## Dispatch completion

Every request returns a `completion` promise separately from its HTTP response. It always resolves to one of:

- `handled`: the registered known-event callback or `onUnknownEvent` completed;
- `unhandled`: the event was valid but had no callback;
- `failed`: a callback failed; the original error and any `onError` failure are included;
- `not-dispatched`: the request was a `PING` or was rejected.

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
