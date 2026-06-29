import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { createSelectMenu, createTypedStringMenu, stringSelectMenu } from "../../base/components";

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

type TypedHandlerInternals = {
  typedSingleValue?: boolean;
  typedAllowedValues?: ReadonlySet<string>;
};

describe("typed string select handler", () => {
  it("does not flag a single value when maxValues is omitted", () => {
    typedStringSelectMenu.build();

    expect((typedStringSelectMenu as TypedHandlerInternals).typedSingleValue).toBe(false);
  });

  it("flags a single value when maxValues is one", () => {
    singleValueStringSelectMenu.build();

    expect((singleValueStringSelectMenu as TypedHandlerInternals).typedSingleValue).toBe(true);
  });

  it("captures the declared values as the allowed set", () => {
    typedStringSelectMenu.build();

    expect([...(typedStringSelectMenu as TypedHandlerInternals).typedAllowedValues!]).toEqual([
      "fun",
      "happy",
    ]);
  });

  it("does not flag anything on untyped string select menus", () => {
    const untypedStringSelectMenu = createSelectMenu({
      type: ComponentType.StringSelect,
      route: "untyped_string_select",
      build: id => stringSelectMenu({
        customId: id(),
        options: ["fun"],
      }),
      run: async ctx => ctx.ok(ctx.values.join(",")),
    });

    untypedStringSelectMenu.build();

    expect((untypedStringSelectMenu as TypedHandlerInternals).typedSingleValue).toBeUndefined();
    expect((untypedStringSelectMenu as TypedHandlerInternals).typedAllowedValues).toBeUndefined();
  });
});
