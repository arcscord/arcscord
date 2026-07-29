/**
 * Node CJS smoke test — loads the *packed* arcscord package through the
 * `require` condition of its `exports` map (resolves `dist/cjs/index.cjs`) and
 * exercises the public API without ever connecting to Discord (no `login()`).
 *
 * Paired with `smoke.mjs`, which does the same through `import`
 * (`dist/esm/index.mjs`), so CI proves both module formats work.
 */
"use strict";

const assert = require("node:assert/strict");
const process = require("node:process");
const { container, v2Message } = require("@arcscord/components");
const {
  createWebhookHandler,
  WebhookEventType,
} = require("@arcscord/webhooks");
const { createWebhookTestClient } = require("@arcscord/webhooks/testing");
const {
  ArcClient,
  button,
  createButton,
  createCommand,
  createEvent,
} = require("arcscord");

const client = new ArcClient("smoke-token", { intents: [] });
const webhooks = createWebhookHandler({
  publicKey: "00".repeat(32),
  handlers: {
    [WebhookEventType.EntitlementCreate]: () => {},
  },
});
assert.equal(v2Message(container("standalone")).components[0].type, 17, "standalone components CJS failed");
assert.equal(typeof webhooks.handleRaw, "function", "standalone webhooks CJS failed");
assert.equal(typeof createWebhookTestClient, "function", "webhooks testing subpath CJS failed");
assert.ok(client instanceof ArcClient, "ArcClient instantiation failed");
assert.equal(typeof client.logger.info, "function", "logger missing");

const pingCommand = createCommand({
  slash: { name: "ping", description: "Check the bot latency" },
  run: ctx => ctx.reply("pong"),
});
assert.equal(pingCommand.slash?.name, "ping", "command build failed");

const pingButton = createButton({
  route: "ping_refresh",
  build: id => button({ label: "Refresh", style: "secondary", customId: id() }),
  run: ctx => ctx.reply("pong"),
});
assert.ok(pingButton.build(), "button build failed");

const readyEvent = createEvent({
  event: "clientReady",
  run: ctx => ctx.ok(true),
});
assert.equal(readyEvent.event, "clientReady", "event registration failed");

client.logger.info("node cjs smoke: client ready");
process.stdout.write("node cjs ok\n");
