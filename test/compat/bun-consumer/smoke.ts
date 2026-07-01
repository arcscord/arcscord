/**
 * Bun smoke test — exercises the public arcscord API from the *packed* package,
 * without ever connecting to Discord (no `client.login()`).
 *
 * It validates the items required by the Bun compatibility gate in
 * `.local/release.md`: ESM import, ArcClient instantiation, building a command,
 * building a component, registering an event handler and the logger.
 */
import process from "node:process";
import {
  ArcClient,
  button,
  createButton,
  createCommand,
  createEvent,
} from "arcscord";

// 1. Instantiate the client (no login).
const client = new ArcClient("smoke-token", {
  intents: [],
});

// 2. Build a slash command.
const pingCommand = createCommand({
  slash: {
    name: "ping",
    description: "Check the bot latency",
  },
  run: ctx => ctx.reply("pong"),
});

// 3. Build a component (button) and render it.
const pingButton = createButton({
  route: "ping_refresh",
  build: id =>
    button({
      label: "Refresh",
      style: "secondary",
      customId: id(),
    }),
  run: ctx => ctx.reply("pong"),
});
const builtButton = pingButton.build();

// 4. Register an event handler.
const readyEvent = createEvent({
  event: "clientReady",
  run: ctx => ctx.ok(true),
});

// 5. Exercise the logger.
client.logger.info("bun smoke: client ready");

if (!(client instanceof ArcClient)) {
  throw new TypeError("ArcClient instantiation failed");
}
if (pingCommand.build.slash?.name !== "ping") {
  throw new Error("command build failed");
}
if (!builtButton) {
  throw new Error("button build failed");
}
if (readyEvent.event !== "clientReady") {
  throw new Error("event registration failed");
}

process.stdout.write("bun ok\n");
process.exit(0);
