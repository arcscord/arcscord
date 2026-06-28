import { expectTypeOf, it } from "vitest";
import { buildModal, modalTextInput } from "../modal";
import { button as buttonComponent } from "../shared/builders";
import { createButton, createModal } from "./component_handler.func";

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
