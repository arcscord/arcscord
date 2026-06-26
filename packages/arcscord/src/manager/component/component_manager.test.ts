import type { Result } from "@arcscord/error";
import type { StringSelectMenuInteraction } from "discord.js";
import type { ComponentHandler } from "../../base/components/interaction/component_handlers.type";
import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { createSelectMenu, createTypedStringMenu, stringSelectMenu } from "../../base/components";
import { ComponentError } from "../../utils/error/class/component_error";
import { ComponentManager } from "./component_manager.class";

const validateStringSelectValues = (
  ComponentManager.prototype as unknown as {
    isTypedStringSelectComponent: (component: ComponentHandler) => boolean;
    validateStringSelectValues: (
      interaction: StringSelectMenuInteraction,
      component: ComponentHandler,
    ) => Result<string | string[], ComponentError>;
  }
).validateStringSelectValues;

const componentManagerPrivateMethods = ComponentManager.prototype as unknown as {
  isTypedStringSelectComponent: (component: ComponentHandler) => boolean;
};

const typedValues = {
  fun: {
    label: "Fun",
    description: "Fun option",
  },
  happy: "Happy",
} as const;

const typedStringSelectMenu = createTypedStringMenu({
  route: "typed_string_select",
  build: id => ({
    customId: id(),
    values: typedValues,
  }),
  run: async (ctx) => {
    const value: "fun" | "happy" = ctx.values[0];

    return ctx.ok(value);
  },
});

const singleValueStringSelectMenu = createTypedStringMenu({
  route: "single_typed_string_select",
  build: id => ({
    customId: id(),
    values: typedValues,
    maxValues: 1,
  }),
  run: async (ctx) => {
    const value: "fun" | "happy" = ctx.values;

    return ctx.ok(value);
  },
});

function createStringSelectInteraction(values: string[]): StringSelectMenuInteraction {
  return {
    channel: null,
    customId: "typed_string_select",
    guild: null,
    user: {
      id: "user_1",
    },
    values,
  } as StringSelectMenuInteraction;
}

describe("component manager", () => {
  it("accepts declared values for typed string select menus", () => {
    typedStringSelectMenu.build();

    const [err, values] = validateStringSelectValues.call(
      componentManagerPrivateMethods,
      createStringSelectInteraction(["fun", "happy"]),
      typedStringSelectMenu,
    );

    expect(err).toBeNull();
    expect(values).toEqual(["fun", "happy"]);
  });

  it("rejects undeclared values for typed string select menus", () => {
    typedStringSelectMenu.build();

    const [err, values] = validateStringSelectValues.call(
      componentManagerPrivateMethods,
      createStringSelectInteraction(["fun", "stale"]),
      typedStringSelectMenu,
    );

    expect(err).toBeInstanceOf(ComponentError);
    expect(err?.message).toBe("received invalid values for typed string select typed_string_select");
    expect(values).toBeNull();
  });

  it("returns a single declared value when maxValues is one", () => {
    singleValueStringSelectMenu.build();

    const [err, values] = validateStringSelectValues.call(
      componentManagerPrivateMethods,
      {
        ...createStringSelectInteraction(["fun"]),
        customId: "single_typed_string_select",
      } as StringSelectMenuInteraction,
      singleValueStringSelectMenu,
    );

    expect(err).toBeNull();
    expect(values).toBe("fun");
  });

  it("keeps untyped string select menus unrestricted", () => {
    const untypedStringSelectMenu = createSelectMenu({
      type: ComponentType.StringSelect,
      route: "untyped_string_select",
      build: id => stringSelectMenu({
        customId: id(),
        options: ["fun"],
      }),
      run: async ctx => ctx.ok(ctx.values.join(",")),
    });

    const [err, values] = validateStringSelectValues.call(
      componentManagerPrivateMethods,
      createStringSelectInteraction(["stale"]),
      untypedStringSelectMenu,
    );

    expect(err).toBeNull();
    expect(values).toEqual(["stale"]);
  });
});
