import type { APIChannel, APIRole, Channel, Role, User } from "discord.js";
import { ComponentType } from "discord-api-types/v10";
import { describe, expectTypeOf, it } from "vitest";
import {
  channelSelectMenu as channelSelectMenuComponent,
  mentionableSelectMenu as mentionableSelectMenuComponent,
  roleSelectMenu as roleSelectMenuComponent,
  stringSelectMenu as stringSelectMenuComponent,
  userSelectMenu as userSelectMenuComponent,
} from "#/base/components/shared/builders";
import { createSelectMenu, createTypedStringMenu } from "../component_handler.func";

describe("select menu handler ctx.values types", () => {
  it("string select ctx.values is string[]", () => {
    createSelectMenu({
      type: ComponentType.StringSelect,
      route: "test",
      build: id => stringSelectMenuComponent({ customId: id(), options: [] }),
      run: async (ctx) => {
        expectTypeOf(ctx.values).toEqualTypeOf<string[]>();
        return ctx.ok();
      },
    });
  });

  it("typed string select ctx.values is literal key array by default", () => {
    createTypedStringMenu({
      route: "test",
      build: id => ({
        customId: id(),
        values: {
          fun: { label: "Fun" },
          happy: { label: "Happy" },
        } as const,
      }),
      run: async (ctx) => {
        expectTypeOf(ctx.values).toEqualTypeOf<("fun" | "happy")[]>();
        return ctx.ok();
      },
    });
  });

  it("typed string select ctx.values is literal union when maxValues is 1", () => {
    createTypedStringMenu({
      route: "test",
      build: id => ({
        customId: id(),
        values: {
          fun: { label: "Fun" },
          happy: { label: "Happy" },
        } as const,
        maxValues: 1,
      }),
      run: async (ctx) => {
        expectTypeOf(ctx.values).toEqualTypeOf<"fun" | "happy">();
        return ctx.ok();
      },
    });
  });

  it("user select ctx.values is User[]", () => {
    createSelectMenu({
      type: ComponentType.UserSelect,
      route: "test",
      build: id => userSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expectTypeOf(ctx.values).toEqualTypeOf<User[]>();
        return ctx.ok();
      },
    });
  });

  it("role select ctx.values is (Role | APIRole)[]", () => {
    createSelectMenu({
      type: ComponentType.RoleSelect,
      route: "test",
      build: id => roleSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expectTypeOf(ctx.values).toEqualTypeOf<(Role | APIRole)[]>();
        return ctx.ok();
      },
    });
  });

  it("mentionable select ctx.values, ctx.roles, ctx.users types", () => {
    createSelectMenu({
      type: ComponentType.MentionableSelect,
      route: "test",
      build: id => mentionableSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expectTypeOf(ctx.values).toEqualTypeOf<(Role | User | APIRole)[]>();
        expectTypeOf(ctx.roles).toEqualTypeOf<(Role | APIRole)[]>();
        expectTypeOf(ctx.users).toEqualTypeOf<User[]>();
        return ctx.ok();
      },
    });
  });

  it("channel select ctx.values is (Channel | APIChannel)[]", () => {
    createSelectMenu({
      type: ComponentType.ChannelSelect,
      route: "test",
      build: id => channelSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expectTypeOf(ctx.values).toEqualTypeOf<(Channel | APIChannel)[]>();
        return ctx.ok();
      },
    });
  });
});
