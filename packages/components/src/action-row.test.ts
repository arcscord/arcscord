import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ChannelSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { describe, expect, it } from "vitest";
import { actionRow } from "./action-row";
import { normalizeActionRow } from "./internal/normalize-action-row";

describe("actionRow", () => {
  it("normalizes one to five buttons", () => {
    const button = new ButtonBuilder().setCustomId("save").setLabel("Save").setStyle(ButtonStyle.Success);
    expect(actionRow(button, button, button, button, button)).toMatchObject({
      type: ComponentType.ActionRow,
      components: [
        { type: ComponentType.Button, customId: "save" },
        { type: ComponentType.Button, customId: "save" },
        { type: ComponentType.Button, customId: "save" },
        { type: ComponentType.Button, customId: "save" },
        { type: ComponentType.Button, customId: "save" },
      ],
    });
  });

  it("preserves Arcscord string-style button compatibility", () => {
    expect(actionRow({ style: "primary", customId: "open", label: "Open" }).components[0]).toMatchObject({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId: "open",
    });
  });

  it.each([
    ["string", new StringSelectMenuBuilder().setCustomId("string").addOptions({ label: "One", value: "one" }), ComponentType.StringSelect],
    ["user", new UserSelectMenuBuilder().setCustomId("user"), ComponentType.UserSelect],
    ["role", new RoleSelectMenuBuilder().setCustomId("role"), ComponentType.RoleSelect],
    ["mentionable", new MentionableSelectMenuBuilder().setCustomId("mentionable"), ComponentType.MentionableSelect],
    ["channel", new ChannelSelectMenuBuilder().setCustomId("channel"), ComponentType.ChannelSelect],
  ])("normalizes a single %s select menu", (_name, select, expectedType) => {
    expect(actionRow(select).components).toEqual([
      expect.objectContaining({ type: expectedType, customId: select.data.custom_id }),
    ]);
  });

  it("normalizes raw API select fields", () => {
    expect(actionRow({
      type: ComponentType.StringSelect,
      custom_id: "raw-select",
      min_values: 1,
      max_values: 2,
      options: [{ label: "One", value: "one" }],
    }).components[0]).toMatchObject({
      customId: "raw-select",
      minValues: 1,
      maxValues: 2,
    });
  });

  it("normalizes existing Discord.js action row builders", () => {
    const select = new StringSelectMenuBuilder()
      .setCustomId("existing")
      .addOptions({ label: "Existing", value: "existing" });
    const builder = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    expect(normalizeActionRow(builder)).toMatchObject({
      type: ComponentType.ActionRow,
      components: [{ type: ComponentType.StringSelect, customId: "existing" }],
    });
  });

  it("enforces Discord action row cardinality at runtime", () => {
    const button = { type: ComponentType.Button, style: ButtonStyle.Primary, customId: "button" } as const;
    const select = {
      type: ComponentType.UserSelect,
      custom_id: "select",
    } as const;
    expect(() => (actionRow as (...items: unknown[]) => unknown)()).toThrow("between one and five");
    expect(() => (actionRow as (...items: unknown[]) => unknown)(button, button, button, button, button, button)).toThrow("between one and five");
    expect(() => (actionRow as (...items: unknown[]) => unknown)(button, select)).toThrow("exactly one select menu");
    expect(() => (actionRow as (...items: unknown[]) => unknown)(select, select)).toThrow("exactly one select menu");
  });
});
