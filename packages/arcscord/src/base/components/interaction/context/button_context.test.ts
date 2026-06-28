import type { Role, User } from "discord.js";
import { describe, expect, it } from "vitest";
import { createMockClient, createMockMessageComponentInteraction } from "#/testing";
import { ButtonContext } from "./button_context";
import {
  ChannelSelectMenuContext,
  MentionableSelectMenuContext,
  RoleSelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "./select_menu_context";

function makeButtonContext(customId = "btn") {
  const client = createMockClient();
  const interaction = createMockMessageComponentInteraction({ customId });
  return new ButtonContext(client, interaction, { locale: "en" });
}

describe("buttonContext", () => {
  it("isButtonContext returns true", () => {
    expect(makeButtonContext().isButtonContext()).toBe(true);
  });

  it("isModalContext returns false", () => {
    expect(makeButtonContext().isModalContext()).toBe(false);
  });

  it("isSelectMenuContext returns false", () => {
    expect(makeButtonContext().isSelectMenuContext()).toBe(false);
  });

  it("isMessageComponentContext returns true", () => {
    expect(makeButtonContext().isMessageComponentContext()).toBe(true);
  });

  it("stores customId from interaction", () => {
    expect(makeButtonContext("my_button").customId).toBe("my_button");
  });
});

describe("select menu context type guards", () => {
  const client = createMockClient();

  function base(customId = "sel") {
    return createMockMessageComponentInteraction({ customId });
  }

  it("stringSelectMenuContext guards", () => {
    const ctx = new StringSelectMenuContext(client, base() as never, { locale: "en", values: ["a"] });
    expect(ctx.isStringSelectMenuContext()).toBe(true);
    expect(ctx.isButtonContext()).toBe(false);
    expect(ctx.isSelectMenuContext()).toBe(true);
  });

  it("userSelectMenuContext guards", () => {
    const user = { id: "user_1" } as User;
    const ctx = new UserSelectMenuContext(client, base() as never, { locale: "en", values: [user] });
    expect(ctx.isUserSelectMenuContext()).toBe(true);
    expect(ctx.isSelectMenuContext()).toBe(true);
    expect(ctx.values).toEqual([user]);
  });

  it("roleSelectMenuContext guards", () => {
    const role = { id: "role_1" } as Role;
    const ctx = new RoleSelectMenuContext(client, base() as never, { locale: "en", values: [role] });
    expect(ctx.isRoleSelectMenuContext()).toBe(true);
    expect(ctx.values).toEqual([role]);
  });

  it("mentionableSelectMenuContext merges roles and users into values", () => {
    const user = { id: "user_1" } as User;
    const role = { id: "role_1" } as Role;
    const ctx = new MentionableSelectMenuContext(client, base() as never, {
      locale: "en",
      roles: [role],
      users: [user],
    });
    expect(ctx.isMentionableSelectMenuContext()).toBe(true);
    expect(ctx.values).toEqual([role, user]);
    expect(ctx.roles).toEqual([role]);
    expect(ctx.users).toEqual([user]);
  });

  it("channelSelectMenuContext guards", () => {
    const channel = { id: "channel_1" } as never;
    const ctx = new ChannelSelectMenuContext(client, base() as never, { locale: "en", values: [channel] });
    expect(ctx.isChannelSelectMenuContext()).toBe(true);
    expect(ctx.values).toEqual([channel]);
  });
});
