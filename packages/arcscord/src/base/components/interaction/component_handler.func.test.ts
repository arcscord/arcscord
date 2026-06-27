import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { buildModal, modalStringSelect, modalTextInput } from "../modal";
import { button as buttonComponent } from "../shared/builders";
import { createButton, createModal } from "./component_handler.func";

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

  it("builds typed modal fields with route IDs", () => {
    const modal = createModal({
      route: "ticket/create/{type}",
      fields: {
        title: modalTextInput({
          label: "Title",
          required: true,
          maxLength: 80,
        }),
        priority: modalStringSelect({
          label: "Priority",
          options: ["low", "medium", "high"],
        }),
      },
      build: (id, fields) => buildModal({
        title: "Create ticket",
        customId: id(),
        components: [
          fields.title.label(),
          fields.priority.label(),
        ],
      }),
      run: async (ctx) => {
        const title: string = ctx.values.title;
        const priority: "low" | "medium" | "high" = ctx.values.priority;
        return ctx.ok(`${title}:${priority}:${ctx.params.type}`);
      },
    });

    expect(modal.build({ type: "bug" })).toMatchObject({
      customId: "ticket/create/$bug",
      title: "Create ticket",
      components: [
        {
          type: ComponentType.Label,
          component: {
            type: ComponentType.TextInput,
            customId: "title",
          },
        },
        {
          type: ComponentType.Label,
          component: {
            type: ComponentType.StringSelect,
            customId: "priority",
            maxValues: 1,
            options: [
              { label: "low", value: "low" },
              { label: "medium", value: "medium" },
              { label: "high", value: "high" },
            ],
          },
        },
      ],
    });
  });

  it("supports untyped modal builders without field definitions", () => {
    const modal = createModal({
      route: "raw/modal",
      build: id => buildModal({
        title: "Raw modal",
        customId: id(),
        components: ["Raw content"],
      }),
      run: async (ctx) => {
        const value = ctx.values.raw;
        return ctx.ok(String(value));
      },
    });

    expect(modal.build()).toEqual({
      customId: "raw/modal",
      title: "Raw modal",
      components: [
        {
          content: "Raw content",
          id: undefined,
          type: ComponentType.TextDisplay,
        },
      ],
    });
  });
});
