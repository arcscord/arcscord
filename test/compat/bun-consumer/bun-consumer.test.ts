/**
 * Native `bun test` suite run against the *packed* arcscord package.
 * Mirrors the smoke checks as assertions — no Discord connection is made.
 */
import {
  ArcClient,
  buildModal,
  button,
  createButton,
  createCommand,
  createEvent,
  createModal,
  createTypedStringMenu,
  modalStringSelect,
  modalTextInput,
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
      slash: {
        name: "search",
        description: "Search for a result",
        options: {
          query: { type: "string", description: "Search query", required: true },
          limit: { type: "integer", description: "Result limit" },
        },
      },
      run: ctx => ctx.reply(`${ctx.options.query}:${ctx.options.limit ?? "all"}`),
    });
    expect(command.slash?.name).toBe("search");
    expect(command.slash?.options).toEqual({
      query: { type: "string", description: "Search query", required: true },
      limit: { type: "integer", description: "Result limit" },
    });
  });

  test("builds a typed modal with stable field ids", () => {
    const modal = createModal({
      route: "ticket/{ticketId}",
      fields: {
        title: modalTextInput({ label: "Title" }),
        priority: modalStringSelect({ label: "Priority", options: ["low", "high"] as const }),
      },
      build: (id, fields) => buildModal({
        title: "Ticket",
        customId: id(),
        components: [fields.title.label(), fields.priority.label()],
      }),
      run: ctx => ctx.reply(`${ctx.values.title}:${ctx.values.priority}`),
    });

    const built = modal.build({ ticketId: "42" });
    expect(built.customId).toBe("ticket/$42");
    expect(built.components).toHaveLength(2);
    expect(built.components[0]).toMatchObject({ label: "Title", component: { customId: "title" } });
    expect(built.components[1]).toMatchObject({
      label: "Priority",
      component: {
        customId: "priority",
        options: [
          { label: "low", value: "low" },
          { label: "high", value: "high" },
        ],
      },
    });
  });

  test("builds typed string selects in multi and single modes", () => {
    const multi = createTypedStringMenu({
      route: "status/{scope}",
      values: {
        open: { label: "Open" },
        closed: { label: "Closed" },
      } as const,
      maxValues: 2,
      build: id => ({ customId: id() }),
      run: async ctx => ctx.ok(),
    });
    const single = createTypedStringMenu({
      route: "status-one",
      values: {
        open: { label: "Open" },
        closed: { label: "Closed" },
      } as const,
      maxValues: 1,
      build: id => ({ customId: id() }),
      run: async ctx => ctx.ok(),
    });

    expect(multi.build({ scope: "all" }).components[0]).toMatchObject({
      customId: "status/$all",
      maxValues: 2,
      options: [
        { label: "Open", value: "open" },
        { label: "Closed", value: "closed" },
      ],
    });
    expect(multi.typedSingleValue).toBe(false);
    expect(multi.typedAllowedValues).toEqual(new Set(["open", "closed"]));
    expect(single.typedSingleValue).toBe(true);
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
