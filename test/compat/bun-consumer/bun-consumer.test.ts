/**
 * Native `bun test` suite run against the *packed* arcscord package.
 * Mirrors the smoke checks as assertions — no Discord connection is made.
 */
import {
  ArcClient,
  button,
  createButton,
  createCommand,
  createEvent,
} from "arcscord";
import { describe, expect, test } from "bun:test";

describe("arcscord bun consumer", () => {
  test("instantiates ArcClient without login", () => {
    const client = new ArcClient("test-token", { intents: [] });
    expect(client).toBeInstanceOf(ArcClient);
    expect(typeof client.logger.info).toBe("function");
  });

  test("builds a slash command", () => {
    const command = createCommand({
      build: {
        slash: { name: "ping", description: "Check the bot latency" },
      },
      run: ctx => ctx.reply("pong"),
    });
    expect(command.build.slash?.name).toBe("ping");
  });

  test("builds a button component", () => {
    const pingButton = createButton({
      route: "ping_refresh",
      build: id => button({ label: "Refresh", style: "secondary", customId: id() }),
      run: ctx => ctx.reply("pong"),
    });
    expect(pingButton.build()).toBeDefined();
  });

  test("registers an event handler", () => {
    const event = createEvent({
      event: "clientReady",
      run: ctx => ctx.ok(true),
    });
    expect(event.event).toBe("clientReady");
    expect(event.name).toBe("clientReady");
  });
});
