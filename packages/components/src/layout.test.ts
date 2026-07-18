import { ButtonStyle, ComponentType, SeparatorSpacingSize } from "discord-api-types/v10";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { describe, expect, it } from "vitest";
import { actionRow } from "./action-row";
import { container } from "./container";
import { accessory, section } from "./section";
import { separator } from "./separator";
import { text } from "./text";
import { thumbnail } from "./thumbnail";

describe("layout components", () => {
  it("creates text, thumbnail, and separator data", () => {
    expect(text("Hello", { id: 1 })).toEqual({ type: ComponentType.TextDisplay, id: 1, content: "Hello" });
    expect(thumbnail({ media: { url: "https://example.com/thumb.png" } })).toMatchObject({ type: ComponentType.Thumbnail });
    expect(separator({ divider: true, spacing: "large" })).toMatchObject({
      type: ComponentType.Separator,
      divider: true,
      spacing: SeparatorSpacingSize.Large,
    });
  });

  it("accepts builders in sections without serializing accessories twice", () => {
    const result = section(
      new TextDisplayBuilder().setContent("Builder text"),
      accessory(new ThumbnailBuilder().setURL("https://example.com/thumb.png")),
    );
    expect(result).toMatchObject({
      type: ComponentType.Section,
      components: [{ content: "Builder text" }],
      accessory: { type: ComponentType.Thumbnail },
    });
  });

  it("accepts button and select action rows in containers", () => {
    const button = new ButtonBuilder().setCustomId("open").setLabel("Open").setStyle(ButtonStyle.Primary);
    const select = new StringSelectMenuBuilder().setCustomId("choice").addOptions({ label: "One", value: "one" });
    const result = container("Choose", actionRow(button), actionRow(select));
    expect(result.components).toMatchObject([
      { type: ComponentType.TextDisplay },
      { type: ComponentType.ActionRow, components: [{ type: ComponentType.Button }] },
      { type: ComponentType.ActionRow, components: [{ type: ComponentType.StringSelect }] },
    ]);
  });

  it("normalizes a complete official ContainerBuilder recursively", () => {
    const sectionBuilder = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent("Section"))
      .setThumbnailAccessory(new ThumbnailBuilder().setURL("https://example.com/thumb.png"));
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setCustomId("builder-select").addOptions({ label: "One", value: "one" }),
    );
    const builder = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent("Container"))
      .addSectionComponents(sectionBuilder)
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large))
      .addActionRowComponents(selectRow);

    expect(container(builder)).toMatchObject({
      components: [
        { content: "Container" },
        { type: ComponentType.Section },
        { type: ComponentType.Separator },
        { type: ComponentType.ActionRow, components: [{ type: ComponentType.StringSelect }] },
      ],
    });
  });

  it("rejects invalid section and container nesting", () => {
    expect(() => (section as (...items: unknown[]) => unknown)("Missing accessory")).toThrow("accessory");
    expect(() => (container as (...items: unknown[]) => unknown)({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId: "invalid",
    })).toThrow("Unsupported container component type");
  });
});
