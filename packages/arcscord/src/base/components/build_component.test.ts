import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import {
  buildButtonActionRow,
  buildChannelSelectMenu,
  buildCheckbox,
  buildCheckboxGroup,
  buildClickableButton,
  buildContainer,
  buildFile,
  buildFileUpload,
  buildLabel,
  buildLinkButton,
  buildMediaGallery,
  buildModal,
  buildPremiumButton,
  buildRadioGroup,
  buildSection,
  buildSeparator,
  buildStringSelectMenu,
  buildTextDisplay,
  buildTextInput,
  buildThumbnail,
} from "./build_component.func";
import {
  buttonToAPI,
  componentInContainerToAPI,
  labelToAPI,
  selectMenuOptionsToAPI,
  selectMenuToAPI,
  textInputToAPI,
} from "./build_component.util";

describe("component builders", () => {
  it("builds link, premium, and clickable buttons", () => {
    expect(buildLinkButton({ url: "https://example.com", label: "Docs" })).toEqual({
      type: ComponentType.Button,
      style: ButtonStyle.Link,
      url: "https://example.com",
      label: "Docs",
    });

    expect(buildPremiumButton({ skuId: "sku_1", disabled: true } as any)).toEqual({
      type: ComponentType.Button,
      style: ButtonStyle.Premium,
      skuId: "sku_1",
      disabled: true,
    });

    expect(buildClickableButton({ customId: "confirm", style: "success", label: "Confirm" })).toEqual({
      type: ComponentType.Button,
      customId: "confirm",
      style: "success",
      label: "Confirm",
    });
  });

  it("converts all button variants to API data", () => {
    expect(buttonToAPI({ type: ComponentType.Button, style: "primary", customId: "save", label: "Save" })).toEqual({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId: "save",
      label: "Save",
      emoji: undefined,
      disabled: undefined,
    });
    expect(buttonToAPI({ type: ComponentType.Button, style: "link", url: "https://example.com", label: "Open" })).toEqual({
      type: ComponentType.Button,
      style: ButtonStyle.Link,
      url: "https://example.com",
      label: "Open",
      emoji: undefined,
      disabled: undefined,
    });
    expect(buttonToAPI({ type: ComponentType.Button, style: ButtonStyle.Premium, skuId: "sku_1" } as any)).toEqual({
      type: ComponentType.Button,
      style: ButtonStyle.Premium,
      skuId: "sku_1",
      disabled: undefined,
    });
  });

  it("builds button action rows with converted button API data", () => {
    expect(buildButtonActionRow(
      buildClickableButton({ customId: "ok", style: "success", label: "OK" }),
      buildLinkButton({ url: "https://example.com", label: "Open" }),
    )).toEqual({
      type: ComponentType.ActionRow,
      components: [
        expect.objectContaining({ type: ComponentType.Button, style: ButtonStyle.Success, customId: "ok" }),
        expect.objectContaining({ type: ComponentType.Button, style: ButtonStyle.Link, url: "https://example.com" }),
      ],
    });
  });

  it("converts select menu options from strings, records, and option objects", () => {
    expect(selectMenuOptionsToAPI(["one", "two"])).toEqual([
      { label: "one", value: "one" },
      { label: "two", value: "two" },
    ]);
    expect(selectMenuOptionsToAPI({
      One: "one",
      two: { label: "Two", description: "Second" },
    })).toEqual([
      { label: "One", value: "one" },
      { label: "Two", description: "Second", value: "two" },
    ]);
    expect(selectMenuOptionsToAPI([{ label: "One", value: "1" }])).toEqual([
      { label: "One", value: "1" },
    ]);
  });

  it("builds string and channel select menus", () => {
    expect(buildStringSelectMenu({
      customId: "status",
      placeholder: "Status",
      options: ["open", "closed"],
    })).toEqual({
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.StringSelect,
          customId: "status",
          placeholder: "Status",
          disabled: undefined,
          required: true,
          minValues: undefined,
          maxValues: undefined,
          options: [
            { label: "open", value: "open" },
            { label: "closed", value: "closed" },
          ],
        },
      ],
    });

    expect(buildChannelSelectMenu({
      customId: "channel",
      channelTypes: ["guildText", "guildForum"],
    })).toEqual({
      type: ComponentType.ActionRow,
      components: [
        expect.objectContaining({
          type: ComponentType.ChannelSelect,
          customId: "channel",
          channelTypes: [0, 15],
        }),
      ],
    });
  });

  it("converts select menus for every non-string select type", () => {
    expect(selectMenuToAPI({ type: ComponentType.UserSelect, customId: "user", defaultValues: [{ id: "1", type: "user" }] } as any)).toMatchObject({
      type: ComponentType.UserSelect,
      customId: "user",
      defaultValues: [{ id: "1", type: "user" }],
    });
    expect(selectMenuToAPI({ type: ComponentType.RoleSelect, customId: "role", defaultValues: [{ id: "2", type: "role" }] } as any)).toMatchObject({
      type: ComponentType.RoleSelect,
      customId: "role",
      defaultValues: [{ id: "2", type: "role" }],
    });
    expect(selectMenuToAPI({ type: ComponentType.MentionableSelect, customId: "mention", defaultValues: [{ id: "3", type: "user" }] } as any)).toMatchObject({
      type: ComponentType.MentionableSelect,
      customId: "mention",
      defaultValues: [{ id: "3", type: "user" }],
    });
  });

  it("converts text inputs and content components", () => {
    expect(textInputToAPI({
      type: ComponentType.TextInput,
      customId: "reason",
      label: "Reason",
      style: "paragraph",
      minLength: 2,
      maxLength: 100,
      required: true,
      value: "Because",
      placeholder: "Explain",
    } as any)).toEqual({
      type: ComponentType.TextInput,
      customId: "reason",
      label: "Reason",
      style: 2,
      minLength: 2,
      maxLength: 100,
      required: true,
      value: "Because",
      placeholder: "Explain",
    });

    expect(buildTextDisplay({ id: 7, content: "Hello" })).toEqual({
      type: ComponentType.TextDisplay,
      id: 7,
      content: "Hello",
    });
    expect(buildThumbnail({ media: { url: "attachment://thumb.png" }, spoiler: true })).toMatchObject({
      type: ComponentType.Thumbnail,
      media: { url: "attachment://thumb.png" },
      spoiler: true,
    });
    expect(buildMediaGallery({ items: [{ media: { url: "attachment://image.png" } }] })).toMatchObject({
      type: ComponentType.MediaGallery,
      items: [{ media: { url: "attachment://image.png" } }],
    });
    expect(buildFile({ file: { url: "attachment://file.txt" }, spoiler: false })).toMatchObject({
      type: ComponentType.File,
      file: { url: "attachment://file.txt" },
      spoiler: false,
    });
    expect(buildSeparator({ spacing: "large", divider: true })).toMatchObject({
      type: ComponentType.Separator,
      spacing: 2,
      divider: true,
    });
  });

  it("builds sections, containers, labels, and modal input components", () => {
    const section = buildSection({
      components: [{ type: ComponentType.TextDisplay, content: "Profile" }],
      accessory: buildClickableButton({ customId: "open", style: "primary", label: "Open" }),
    });

    expect(section).toMatchObject({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: "Profile" }],
      accessory: { type: ComponentType.Button, customId: "open", style: ButtonStyle.Primary },
    });

    expect(buildContainer({
      accentColor: 0xFFAA00,
      spoiler: true,
      components: [
        buildTextDisplay({ content: "Details" }),
        buildFile({ file: { url: "attachment://report.txt" } }),
        section,
      ] as any,
    })).toMatchObject({
      type: ComponentType.Container,
      accentColor: 0xFFAA00,
      spoiler: true,
      components: [
        { type: ComponentType.TextDisplay, content: "Details" },
        { type: ComponentType.File, file: { url: "attachment://report.txt" } },
        { type: ComponentType.Section },
      ],
    });

    expect(buildFileUpload({ customId: "upload", minValues: 1, maxValues: 2, required: true })).toEqual({
      type: ComponentType.FileUpload,
      id: undefined,
      customId: "upload",
      minValues: 1,
      maxValues: 2,
      required: true,
    });
    expect(buildRadioGroup({ customId: "choice", options: [{ label: "A", value: "a" }], required: true })).toMatchObject({
      type: ComponentType.RadioGroup,
      customId: "choice",
      options: [{ label: "A", value: "a" }],
      required: true,
    });
    expect(buildCheckboxGroup({ customId: "checks", options: [{ label: "A", value: "a" }], minValues: 0, maxValues: 1 })).toMatchObject({
      type: ComponentType.CheckboxGroup,
      customId: "checks",
      minValues: 0,
      maxValues: 1,
    });
    expect(buildCheckbox({ customId: "accept", default: true })).toEqual({
      type: ComponentType.Checkbox,
      id: undefined,
      customId: "accept",
      default: true,
    });

    expect(labelToAPI(buildLabel({
      label: "Upload",
      description: "Attach a file",
      component: buildFileUpload({ customId: "file" }),
    }) as any)).toMatchObject({
      type: ComponentType.Label,
      label: "Upload",
      description: "Attach a file",
      component: {
        type: ComponentType.FileUpload,
        customId: "file",
      },
    });
  });

  it("builds modals from v2 top-level components and legacy text inputs", () => {
    const label = buildLabel({
      label: "Reason",
      component: buildTextInput({
        customId: "reason",
        style: "short",
        required: true,
      }),
    });

    expect(buildModal("Report", "report", label, buildTextDisplay({ content: "Details" }))).toEqual({
      title: "Report",
      customId: "report",
      components: [
        expect.objectContaining({
          type: ComponentType.Label,
          label: "Reason",
          component: expect.objectContaining({
            type: ComponentType.TextInput,
            customId: "reason",
            style: 1,
            required: true,
          }),
        }),
        { type: ComponentType.TextDisplay, id: undefined, content: "Details" },
      ],
    });

    expect(buildModal("Legacy", "legacy", {
      label: "Name",
      customId: "name",
      style: "short",
    } as any, {
      label: "Bio",
      customId: "bio",
      style: "paragraph",
    } as any)).toEqual({
      title: "Legacy",
      customId: "legacy",
      components: [
        { type: ComponentType.ActionRow, components: [expect.objectContaining({ customId: "name", style: 1 })] },
        { type: ComponentType.ActionRow, components: [expect.objectContaining({ customId: "bio", style: 2 })] },
      ],
    });

    expect(buildModal("Typed", "typed", {
      name: { label: "Name", style: "short" },
      bio: { label: "Bio", style: "paragraph" },
    } as any)).toEqual({
      title: "Typed",
      customId: "typed",
      components: [
        { type: ComponentType.ActionRow, components: [expect.objectContaining({ customId: "name", style: 1 })] },
        { type: ComponentType.ActionRow, components: [expect.objectContaining({ customId: "bio", style: 2 })] },
      ],
    });
  });

  it("throws for unsupported container components", () => {
    expect(() => componentInContainerToAPI({ type: ComponentType.Button } as any)).toThrow("Unsupported container component type");
  });
});
