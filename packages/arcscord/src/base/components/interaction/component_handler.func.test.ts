import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { button as buttonComponent } from "../shared/builders";
import { createButton } from "./component_handler.func";

describe("component handler builders", () => {
  it("keeps static route build arguments unchanged", () => {
    const button = createButton({
      route: "static_button",
      build: (id, label) => buttonComponent({
        customId: id(),
        label,
        style: "primary",
      }),
      run: async ctx => ctx.ok(true),
    });

    expect(button.build("Open")).toEqual({
      type: ComponentType.Button,
      customId: "static_button",
      label: "Open",
      style: "primary",
    });
  });

  it("accepts route params before regular build arguments for dynamic routes", () => {
    const button = createButton({
      route: "ticket/close/{ticketId}",
      build: (id, label) => buttonComponent({
        customId: id(),
        label,
        style: "danger",
      }),
      run: async ctx => ctx.ok(ctx.params.ticketId),
    });

    expect(button.build({ ticketId: "42" }, "Close ticket")).toEqual({
      type: ComponentType.Button,
      customId: "ticket/close/$42",
      label: "Close ticket",
      style: "danger",
    });
  });
});
