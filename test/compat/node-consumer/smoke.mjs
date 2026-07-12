/**
 * Node ESM smoke test — loads the *packed* arcscord package through the
 * `import` condition of its `exports` map (resolves `dist/esm/index.mjs`) and
 * exercises the public API without ever connecting to Discord (no `login()`).
 *
 * Paired with `smoke.cjs`, which does the same through `require`
 * (`dist/cjs/index.cjs`), so CI proves both module formats work.
 */
import assert from "node:assert/strict";
import process from "node:process";
import {
  ArcClient,
  button,
  createButton,
  createCommand,
  createEvent,
} from "arcscord";

const client = new ArcClient("smoke-token", { intents: [] });
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

client.logger.info("node esm smoke: client ready");
process.stdout.write("node esm ok\n");
