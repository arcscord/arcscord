import {
  ButtonBuilder,
  ChannelSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { describe, it } from "vitest";
import { actionRow } from "./action-row";

describe("actionRow public types", () => {
  it("accepts Discord's valid message action row combinations", () => {
    const button = new ButtonBuilder();
    actionRow(button, button, button, button, button);
    actionRow(new StringSelectMenuBuilder());
    actionRow(new UserSelectMenuBuilder());
    actionRow(new RoleSelectMenuBuilder());
    actionRow(new MentionableSelectMenuBuilder());
    actionRow(new ChannelSelectMenuBuilder());
  });

  it("rejects invalid cardinalities and combinations", () => {
    const button = new ButtonBuilder();
    const select = new StringSelectMenuBuilder();
    // @ts-expect-error Discord permits at most five buttons.
    actionRow(button, button, button, button, button, button);
    // @ts-expect-error A select menu must be the only component in its row.
    actionRow(button, select);
    // @ts-expect-error A row cannot contain multiple select menus.
    actionRow(select, select);
  });
});
