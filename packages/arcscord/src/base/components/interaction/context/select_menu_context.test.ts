import type { Role, User } from "discord.js";
import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import {
  channelSelectMenu as channelSelectMenuComponent,
  mentionableSelectMenu as mentionableSelectMenuComponent,
  roleSelectMenu as roleSelectMenuComponent,
  stringSelectMenu as stringSelectMenuComponent,
  userSelectMenu as userSelectMenuComponent,
} from "#/base/components/shared/builders";
import {
  createMockChannelSelectMenuInteraction,
  createMockClient,
  createMockMentionableSelectMenuInteraction,
  createMockRoleSelectMenuInteraction,
  createMockStringSelectMenuInteraction,
  createMockUserSelectMenuInteraction,
} from "#/testing";
import { createSelectMenu } from "../component_handler.func";
import {
  ChannelSelectMenuContext,
  MentionableSelectMenuContext,
  RoleSelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "./select_menu_context";

describe("string select menu", () => {
  const client = createMockClient();

  it("type guards return correct values in run()", async () => {
    const handler = createSelectMenu({
      type: ComponentType.StringSelect,
      route: "sel",
      build: id => stringSelectMenuComponent({ customId: id(), options: ["a", "b"] }),
      run: async (ctx) => {
        expect(ctx.isStringSelectMenuContext()).toBe(true);
        expect(ctx.isButtonContext()).toBe(false);
        expect(ctx.isSelectMenuContext()).toBe(true);
        expect(ctx.isMessageComponentContext()).toBe(true);
        return ctx.ok();
      },
    });

    const ctx = new StringSelectMenuContext(client, createMockStringSelectMenuInteraction() as never, { locale: "en", values: ["a"] });
    await handler.run(ctx as never);
  });

  it("ctx.values contains the selected strings", async () => {
    const handler = createSelectMenu({
      type: ComponentType.StringSelect,
      route: "sel",
      build: id => stringSelectMenuComponent({ customId: id(), options: ["a", "b"] }),
      run: async (ctx) => {
        expect(ctx.values).toEqual(["a", "b"]);
        return ctx.ok();
      },
    });

    const ctx = new StringSelectMenuContext(client, createMockStringSelectMenuInteraction() as never, { locale: "en", values: ["a", "b"] });
    await handler.run(ctx as never);
  });
});

describe("user select menu", () => {
  const client = createMockClient();

  it("type guards return correct values in run()", async () => {
    const handler = createSelectMenu({
      type: ComponentType.UserSelect,
      route: "sel",
      build: id => userSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expect(ctx.isUserSelectMenuContext()).toBe(true);
        expect(ctx.isSelectMenuContext()).toBe(true);
        return ctx.ok();
      },
    });

    const user = { id: "user_1" } as User;
    const ctx = new UserSelectMenuContext(client, createMockUserSelectMenuInteraction() as never, { locale: "en", values: [user] });
    await handler.run(ctx as never);
  });

  it("ctx.values contains resolved users", async () => {
    const user = { id: "user_1" } as User;
    const handler = createSelectMenu({
      type: ComponentType.UserSelect,
      route: "sel",
      build: id => userSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expect(ctx.values).toEqual([user]);
        return ctx.ok();
      },
    });

    const ctx = new UserSelectMenuContext(client, createMockUserSelectMenuInteraction() as never, { locale: "en", values: [user] });
    await handler.run(ctx as never);
  });
});

describe("role select menu", () => {
  const client = createMockClient();

  it("type guards return correct values in run()", async () => {
    const handler = createSelectMenu({
      type: ComponentType.RoleSelect,
      route: "sel",
      build: id => roleSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expect(ctx.isRoleSelectMenuContext()).toBe(true);
        expect(ctx.isSelectMenuContext()).toBe(true);
        return ctx.ok();
      },
    });

    const role = { id: "role_1" } as Role;
    const ctx = new RoleSelectMenuContext(client, createMockRoleSelectMenuInteraction() as never, { locale: "en", values: [role] });
    await handler.run(ctx as never);
  });

  it("ctx.values contains resolved roles", async () => {
    const role = { id: "role_1" } as Role;
    const handler = createSelectMenu({
      type: ComponentType.RoleSelect,
      route: "sel",
      build: id => roleSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expect(ctx.values).toEqual([role]);
        return ctx.ok();
      },
    });

    const ctx = new RoleSelectMenuContext(client, createMockRoleSelectMenuInteraction() as never, { locale: "en", values: [role] });
    await handler.run(ctx as never);
  });
});

describe("mentionable select menu", () => {
  const client = createMockClient();

  it("type guards return correct values in run()", async () => {
    const handler = createSelectMenu({
      type: ComponentType.MentionableSelect,
      route: "sel",
      build: id => mentionableSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expect(ctx.isMentionableSelectMenuContext()).toBe(true);
        expect(ctx.isSelectMenuContext()).toBe(true);
        return ctx.ok();
      },
    });

    const ctx = new MentionableSelectMenuContext(client, createMockMentionableSelectMenuInteraction() as never, { locale: "en", roles: [], users: [] });
    await handler.run(ctx as never);
  });

  it("ctx.values merges roles and users, ctx.roles and ctx.users are separate", async () => {
    const user = { id: "user_1" } as User;
    const role = { id: "role_1" } as Role;
    const handler = createSelectMenu({
      type: ComponentType.MentionableSelect,
      route: "sel",
      build: id => mentionableSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expect(ctx.values).toEqual([role, user]);
        expect(ctx.roles).toEqual([role]);
        expect(ctx.users).toEqual([user]);
        return ctx.ok();
      },
    });

    const ctx = new MentionableSelectMenuContext(client, createMockMentionableSelectMenuInteraction() as never, { locale: "en", roles: [role], users: [user] });
    await handler.run(ctx as never);
  });
});

describe("channel select menu", () => {
  const client = createMockClient();

  it("type guards return correct values in run()", async () => {
    const handler = createSelectMenu({
      type: ComponentType.ChannelSelect,
      route: "sel",
      build: id => channelSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expect(ctx.isChannelSelectMenuContext()).toBe(true);
        expect(ctx.isSelectMenuContext()).toBe(true);
        return ctx.ok();
      },
    });

    const ctx = new ChannelSelectMenuContext(client, createMockChannelSelectMenuInteraction() as never, { locale: "en", values: [] });
    await handler.run(ctx as never);
  });

  it("ctx.values contains resolved channels", async () => {
    const channel = { id: "channel_1" } as never;
    const handler = createSelectMenu({
      type: ComponentType.ChannelSelect,
      route: "sel",
      build: id => channelSelectMenuComponent({ customId: id(), maxValues: 10 }),
      run: async (ctx) => {
        expect(ctx.values).toEqual([channel]);
        return ctx.ok();
      },
    });

    const ctx = new ChannelSelectMenuContext(client, createMockChannelSelectMenuInteraction() as never, { locale: "en", values: [channel] });
    await handler.run(ctx as never);
  });
});
