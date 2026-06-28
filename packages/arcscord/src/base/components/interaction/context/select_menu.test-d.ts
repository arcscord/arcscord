import type { User } from "discord.js";
import { expectTypeOf, it } from "vitest";
import { createMockClient } from "#/testing";
import {
  RoleSelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "./select_menu_context";

const client = createMockClient();

it("stringSelectMenuContext.values is string[] without typed options", () => {
  const ctx = new StringSelectMenuContext(client, {} as never, { locale: "en", values: ["a", "b"] });
  expectTypeOf(ctx.values).toEqualTypeOf<string[]>();
});

it("stringSelectMenuContext.values is string literal array with typed options", () => {
  type Values = { fun: { label: "Fun" }; happy: "Happy" };
  const ctx = new StringSelectMenuContext<[], Values, string, undefined>(client, {} as never, {
    locale: "en",
    values: ["fun", "happy"] as ("fun" | "happy")[],
  });
  expectTypeOf(ctx.values).toEqualTypeOf<("fun" | "happy")[]>();
});

it("stringSelectMenuContext.values is string literal when maxValues is 1", () => {
  type Values = { fun: { label: "Fun" }; happy: "Happy" };
  const ctx = new StringSelectMenuContext<[], Values, string, 1>(client, {} as never, {
    locale: "en",
    values: "fun",
  });
  expectTypeOf(ctx.values).toEqualTypeOf<"fun" | "happy">();
});

it("userSelectMenuContext.values is User[]", () => {
  const ctx = new UserSelectMenuContext(client, {} as never, { locale: "en", values: [] });
  expectTypeOf(ctx.values).toEqualTypeOf<User[]>();
});

it("roleSelectMenuContext.values is not User[]", () => {
  const ctx = new RoleSelectMenuContext(client, {} as never, { locale: "en", values: [] });
  expectTypeOf(ctx.values).not.toEqualTypeOf<User[]>();
});
