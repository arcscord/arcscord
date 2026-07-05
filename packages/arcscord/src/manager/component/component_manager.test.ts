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
  values: typedValues,
  build: id => ({
    customId: id(),
  }),
  run: async (ctx) => {
    const value: "fun" | "happy" = ctx.values[0];

    return ctx.ok(value);
  },
});

const singleValueStringSelectMenu = createTypedStringMenu({
  route: "single_typed_string_select",
  values: typedValues,
  maxValues: 1,
  build: id => ({
    customId: id(),
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
  it("does not flag a single value when maxValues is omitted, even before build() ever runs", () => {
    expect((typedStringSelectMenu as TypedHandlerInternals).typedSingleValue).toBe(false);
  });

  it("flags a single value when maxValues is one, even before build() ever runs", () => {
    expect((singleValueStringSelectMenu as TypedHandlerInternals).typedSingleValue).toBe(true);
  });

  it("captures the declared values as the allowed set, even before build() ever runs", () => {
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

    expect((untypedStringSelectMenu as TypedHandlerInternals).typedSingleValue).toBeUndefined();
    expect((untypedStringSelectMenu as TypedHandlerInternals).typedAllowedValues).toBeUndefined();
  });
});
