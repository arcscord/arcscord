import { expectTypeOf, it } from "vitest";
import { buildModal, modalTextInput } from "../modal";
import { button as buttonComponent } from "../shared/builders";
import { createButton, createModal, createTypedStringMenu } from "./component_handler.func";

it("types ctx.params from a static route (no params)", () => {
  createButton({
    route: "my_button",
    build: id => buttonComponent({ customId: id(), style: "primary", label: "Click" }),
    run: (ctx) => {
      expectTypeOf(ctx.params).toEqualTypeOf<Record<never, string>>();
      return ctx.ok();
    },
  });
});

it("types ctx.params.ticketId as string for route ticket/close/{ticketId}", () => {
  createButton({
    route: "ticket/close/{ticketId}",
    build: (id, label) => buttonComponent({ customId: id(), style: "danger", label }),
    run: (ctx) => {
      expectTypeOf(ctx.params).toEqualTypeOf<{ ticketId: string }>();
      expectTypeOf(ctx.params.ticketId).toEqualTypeOf<string>();
      return ctx.ok(ctx.params.ticketId);
    },
  });
});

it("types ctx.params with multiple route variables", () => {
  createButton({
    route: "guild/{guildId}/channel/{channelId}",
    build: id => buttonComponent({ customId: id(), style: "secondary", label: "Go" }),
    run: (ctx) => {
      expectTypeOf(ctx.params).toEqualTypeOf<{ guildId: string; channelId: string }>();
      expectTypeOf(ctx.params.guildId).toEqualTypeOf<string>();
      expectTypeOf(ctx.params.channelId).toEqualTypeOf<string>();
      return ctx.ok();
    },
  });
});

it("build takes only options for a static route", () => {
  const btn = createButton({
    route: "static_button",
    build: (id, label) => buttonComponent({ customId: id(), label, style: "primary" }),
    run: async ctx => ctx.ok(),
  });
  expectTypeOf(btn.build).parameters.toEqualTypeOf<[string]>();
});

it("build takes params object first then options for a dynamic route", () => {
  const btn = createButton({
    route: "ticket/close/{ticketId}",
    build: (id, label) => buttonComponent({ customId: id(), label, style: "danger" }),
    run: async ctx => ctx.ok(),
  });
  expectTypeOf(btn.build).parameters.toEqualTypeOf<[{ ticketId: string }, string]>();
});

it("build takes multiple params objects for routes with several variables", () => {
  const btn = createButton({
    route: "guild/{guildId}/channel/{channelId}",
    build: id => buttonComponent({ customId: id(), style: "secondary", label: "Go" }),
    run: async ctx => ctx.ok(),
  });
  expectTypeOf(btn.build).parameters.toEqualTypeOf<[{ guildId: string; channelId: string }]>();
});

it("types modal ctx.params from route", () => {
  createModal({
    route: "ticket/create/{type}",
    fields: {
      title: modalTextInput({ label: "Title" }),
    },
    build: (id, fields) => buildModal({ title: "T", customId: id(), components: [fields.title.label()] }),
    run: (ctx) => {
      expectTypeOf(ctx.params).toEqualTypeOf<{ type: string }>();
      expectTypeOf(ctx.params.type).toEqualTypeOf<string>();
      return ctx.ok();
    },
  });
});

it("types typed string select option overrides without changing build arguments or values", () => {
  const menu = createTypedStringMenu({
    route: "status/{scope}",
    values: {
      open: { label: "Open" },
      closed: { label: "Closed" },
    } as const,
    build: (id, labels: { open: string; closed: string }) => ({
      customId: id(),
      optionOverrides: {
        open: {
          label: labels.open,
          description: "Available",
          emoji: "✅",
          default: true,
        },
        closed: {
          label: labels.closed,
          default: false,
        },
      },
    }),
    run: async (ctx) => {
      expectTypeOf(ctx.values).toEqualTypeOf<("open" | "closed")[]>();
      return ctx.ok();
    },
  });

  expectTypeOf(menu.build).parameters.toEqualTypeOf<[{ scope: string }, { open: string; closed: string }]>();
});

it("rejects undeclared typed string select override keys", () => {
  createTypedStringMenu({
    route: "status",
    values: {
      open: { label: "Open" },
    } as const,
    build: id => ({
      customId: id(),
      optionOverrides: {
        // @ts-expect-error Only keys declared in values can be overridden.
        missing: { label: "Missing" },
      },
    }),
    run: async ctx => ctx.ok(),
  });
});

it("rejects value overrides for typed string select options", () => {
  createTypedStringMenu({
    route: "status",
    values: {
      open: { label: "Open" },
    } as const,
    build: id => ({
      customId: id(),
      optionOverrides: {
        open: {
          // @ts-expect-error Option values stay fixed and cannot be overridden.
          value: "closed",
        },
      },
    }),
    run: async ctx => ctx.ok(),
  });
});
