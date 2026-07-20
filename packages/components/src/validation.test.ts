import type { APIStringSelectComponent } from "discord-api-types/v10";
import type { MessageComponentValidationError } from "./validation-error";
import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SelectMenuDefaultValueType,
  SeparatorSpacingSize,
} from "discord-api-types/v10";
import { ButtonBuilder, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { actionRow } from "./action-row";
import { text } from "./text";
import {
  validateActionRow,
  validateButton,
  validateContainer,
  validateFile,
  validateMediaGallery,
  validateMediaGalleryItem,
  validateMessageComponent,
  validateSection,
  validateSelectMenu,
  validateSeparator,
  validateTextDisplay,
  validateThumbnail,
  validateV2Message,
} from "./validation";
import { isMessageComponentValidationError } from "./validation-error";

function validationError(run: () => unknown): MessageComponentValidationError {
  try {
    run();
  }
  catch (error) {
    expect(isMessageComponentValidationError(error)).toBe(true);
    return error as MessageComponentValidationError;
  }
  throw new Error("Expected component validation to fail");
}

describe("message component validators", () => {
  it("returns canonical data and validates Discord.js builders", () => {
    const display = new TextDisplayBuilder().setContent("Valid");
    const thumbnail = new ThumbnailBuilder().setURL("https://example.com/image.png");
    expect(validateTextDisplay(display)).toEqual({ type: ComponentType.TextDisplay, content: "Valid" });
    expect(validateThumbnail(thumbnail)).toEqual({
      type: ComponentType.Thumbnail,
      media: { url: "https://example.com/image.png" },
    });
  });

  it("reports structured text and builder serialization failures", () => {
    const empty = validationError(() => validateTextDisplay(""));
    expect(empty).toMatchObject({ rule: "string-length", path: "textDisplay" });

    const builder = {
      toJSON: () => {
        throw new Error("broken");
      },
    };
    const serialized = validationError(() => validateTextDisplay(builder as unknown as TextDisplayBuilder));
    expect(serialized).toMatchObject({ rule: "builder-serialization", path: "textDisplay" });
    expect(serialized.cause).toBeInstanceOf(Error);
  });

  it("validates builder discriminators instead of trusting toJSON", () => {
    const builder = new ButtonBuilder({
      type: ComponentType.TextDisplay,
      style: ButtonStyle.Primary,
      custom_id: "wrong-type",
      label: "Wrong type",
    } as never);
    const error = validationError(() => validateButton(builder));
    expect(error).toMatchObject({
      rule: "unexpected-component-type",
      path: "button.type",
      details: {
        actual: ComponentType.TextDisplay,
        expected: [ComponentType.Button],
      },
    });
  });

  it("serializes each builder once per pipeline and again on a new call", () => {
    const button = {
      toJSON: vi.fn(() => ({
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        custom_id: "once",
        label: "Once",
      } as const)),
    };
    const row = {
      type: ComponentType.ActionRow,
      components: [button, button],
    };

    expect(validateActionRow(row as never)).toMatchObject({
      components: [
        { customId: "once" },
        { customId: "once" },
      ],
    });
    expect(button.toJSON).toHaveBeenCalledTimes(1);

    validateButton(button);
    expect(button.toJSON).toHaveBeenCalledTimes(2);
  });

  it("normalizes aliases and rejects conflicting aliases", () => {
    expect(validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId: "same",
      custom_id: "same",
      label: "Same",
    } as never)).toMatchObject({ customId: "same" });

    const conflict = validationError(() => validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId: "camel",
      custom_id: "snake",
      label: "Conflict",
    } as never));
    expect(conflict).toMatchObject({
      rule: "conflicting-field-aliases",
      path: "button.customId",
    });
  });

  it("creates detached canonical nested data", () => {
    const input = {
      type: ComponentType.MediaGallery,
      items: [{ media: { url: "https://example.com/image.png" }, description: "Image" }],
    };
    const output = validateMediaGallery(input);
    expect(output).not.toBe(input);
    expect(output.items).not.toBe(input.items);
    expect(output.items[0]).not.toBe(input.items[0]);
    expect(output.items[0]?.media).not.toBe(input.items[0]?.media);

    input.items[0]!.media.url = "https://example.com/changed.png";
    expect(output.items[0]?.media.url).toBe("https://example.com/image.png");
  });

  it("revalidates helper output when it enters a new message pipeline", () => {
    const display = text("Initially valid");
    display.content = "";

    const error = validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [display],
    }));
    expect(error).toMatchObject({
      rule: "string-length",
      path: "message.components[0].content",
    });
  });

  it("validates thumbnail and media-gallery fields", () => {
    validateMediaGalleryItem({ media: { url: "attachment://image.png" }, description: "Image" });
    validateMediaGallery({ type: ComponentType.MediaGallery, items: [{ media: { url: "https://example.com/image.png" } }] });
    validateThumbnail({
      type: ComponentType.Thumbnail,
      media: { url: "ftp://example.com/image.png" },
    });

    expect(validationError(() => validateThumbnail({
      type: ComponentType.Thumbnail,
      media: { url: "not a URL" },
    })).rule).toBe("url");
    expect(validationError(() => validateMediaGallery({
      type: ComponentType.MediaGallery,
      items: [],
    })).rule).toBe("media-gallery-cardinality");
  });

  it("validates file protocols and separator spacing", () => {
    validateFile({ type: ComponentType.File, file: { url: "attachment://report.pdf" } });
    validateSeparator({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Large });
    expect(validationError(() => validateFile({
      type: ComponentType.File,
      file: { url: "https://example.com/report.pdf" },
    })).rule).toBe("url-protocol");
    expect(validationError(() => validateSeparator({
      type: ComponentType.Separator,
      spacing: 3 as SeparatorSpacingSize,
    })).rule).toBe("separator-spacing");
  });

  it("validates every button style contract", () => {
    validateButton({ type: ComponentType.Button, style: ButtonStyle.Primary, custom_id: "save", label: "Save" });
    validateButton({ type: ComponentType.Button, style: ButtonStyle.Link, url: "https://example.com", label: "Open" });
    validateButton({ type: ComponentType.Button, style: ButtonStyle.Premium, sku_id: "123" });
    validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      custom_id: "emoji-id",
      emoji: { id: "123", name: "" },
    });
    validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      custom_id: "emoji-long-name",
      emoji: { id: "123", name: "x".repeat(101) },
    });

    expect(validationError(() => validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Link,
      custom_id: "invalid",
      label: "Invalid",
    } as never)).rule).toBe("string");
    expect(validationError(() => validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Premium,
      sku_id: "123",
      label: "Invalid",
    } as never)).rule).toBe("premium-button-fields");
    expect(validationError(() => validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Premium,
      sku_id: "18446744073709551616",
    })).rule).toBe("snowflake");
  });

  it("validates select bounds, options, defaults, and action-row composition", () => {
    const select = {
      type: ComponentType.StringSelect,
      custom_id: "choice",
      min_values: 1,
      max_values: 2,
      options: [{ label: "One", value: "one" }],
    } as APIStringSelectComponent;
    validateSelectMenu(select);
    validateActionRow({ type: ComponentType.ActionRow, components: [select] });

    expect(validationError(() => validateSelectMenu({
      ...select,
      min_values: 2,
      max_values: 1,
    })).rule).toBe("select-menu-bounds");
    expect(validationError(() => validateSelectMenu({
      ...select,
      options: [],
    })).rule).toBe("select-menu-options");
    expect(validationError(() => validateSelectMenu({
      ...select,
      min_values: 2,
      max_values: 2,
    })).rule).toBe("select-menu-options");
    validateSelectMenu({
      ...select,
      min_values: 0,
    });
    validateSelectMenu({
      ...select,
      options: [{ label: "One", value: "one", description: "" }],
    });
    expect(validationError(() => validateSelectMenu({
      ...select,
      options: [{ label: "One", value: "same" }, { label: "Two", value: "same" }],
    })).rule).toBe("select-menu-option-value");
    validateSelectMenu({
      type: ComponentType.UserSelect,
      custom_id: "users",
      min_values: 2,
      max_values: 2,
      default_values: [{ type: SelectMenuDefaultValueType.User, id: "123" }],
    });
    expect(validationError(() => validateSelectMenu({
      type: ComponentType.UserSelect,
      custom_id: "users",
      max_values: 2,
      default_values: [{ type: SelectMenuDefaultValueType.User, id: "123" }, { type: SelectMenuDefaultValueType.User, id: "123" }],
    })).rule).toBe("select-menu-default-value");
    expect(validationError(() => validateSelectMenu({
      type: ComponentType.ChannelSelect,
      custom_id: "channels",
      channel_types: [0, 0],
    })).rule).toBe("channel-types-unique");
    expect(validationError(() => validateActionRow({
      type: ComponentType.ActionRow,
      components: [select, select],
    } as never)).rule).toBe("action-row-composition");
  });

  it("validates recursive section and container limits", () => {
    const button = { type: ComponentType.Button, style: ButtonStyle.Primary, custom_id: "open", label: "Open" } as const;
    validateSection({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: "Body" }],
      accessory: button,
    });
    expect(validationError(() => validateSection({
      type: ComponentType.Section,
      components: Array.from({ length: 4 }, () => ({ type: ComponentType.TextDisplay, content: "Body" })),
      accessory: button,
    } as never)).rule).toBe("section-cardinality");
    validateContainer({
      type: ComponentType.Container,
      components: Array.from({ length: 11 }, () => ({ type: ComponentType.TextDisplay, content: "Body" })),
    });
    validateContainer({
      type: ComponentType.Container,
      components: Array.from({ length: 40 }, () => ({ type: ComponentType.TextDisplay, content: "Body" })),
    });
    expect(validationError(() => validateContainer({
      type: ComponentType.Container,
      components: Array.from({ length: 41 }, () => ({ type: ComponentType.TextDisplay, content: "Body" })),
    } as never)).rule).toBe("container-cardinality");
    validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [{
        type: ComponentType.Container,
        components: Array.from({ length: 39 }, () => ({ type: ComponentType.TextDisplay, content: "x" })),
      }],
    });
    expect(validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [{
        type: ComponentType.Container,
        components: Array.from({ length: 40 }, () => ({ type: ComponentType.TextDisplay, content: "x" })),
      }],
    })).rule).toBe("message-component-count");
  });

  it("dispatches individual interactive components while rejecting them at message top level", () => {
    const button = { type: ComponentType.Button, style: ButtonStyle.Primary, custom_id: "open", label: "Open" } as const;
    expect(validateMessageComponent(button)).toEqual({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId: "open",
      label: "Open",
    });
    expect(validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [button],
    } as never)).rule).toBe("component-placement");
  });

  it("distinguishes an unexpected discriminator from invalid placement", () => {
    const unexpected = validationError(() => validateMessageComponent({ type: 999 } as never));
    expect(unexpected).toMatchObject({
      rule: "unexpected-component-type",
      path: "component.type",
      details: { actual: 999 },
    });

    const misplaced = validationError(() => validateMessageComponent({
      type: ComponentType.TextInput,
      custom_id: "text-input",
      style: 1,
      label: "Label",
    } as never));
    expect(misplaced).toMatchObject({
      rule: "component-placement",
      path: "component.type",
      details: { actual: ComponentType.TextInput },
    });
  });

  it("enforces the total component count at 40", () => {
    const forty = Array.from({ length: 40 }, (_, index) => text(String(index)));
    validateV2Message({ flags: MessageFlags.IsComponentsV2, components: forty });
    expect(validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [...forty, text("overflow")],
    })).rule).toBe("message-component-count");
    expect(validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: Array.from({ length: 41 }, (_, index) => String(index)),
    })).rule).toBe("message-component-count");
  });

  it("enforces the cumulative Text Display budget at 4000 characters", () => {
    validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [text("a".repeat(2000)), text("b".repeat(2000))],
    });
    const error = validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [text("a".repeat(2001))],
        },
        {
          type: ComponentType.Container,
          components: [text("b".repeat(2001))],
        },
      ],
    }));
    expect(error).toMatchObject({
      rule: "message-displayable-text-size",
      details: { maximum: 4000, actual: 4002 },
    });
  });

  it("limits component ids to Discord's signed 32-bit range", () => {
    validateTextDisplay({ type: ComponentType.TextDisplay, id: 0x7FFF_FFFF, content: "max" });
    const error = validationError(() => validateTextDisplay({
      type: ComponentType.TextDisplay,
      id: 0x8000_0000,
      content: "overflow",
    }));
    expect(error).toMatchObject({
      rule: "integer-range",
      path: "textDisplay.id",
      details: { maximum: 0x7FFF_FFFF },
    });
  });

  it("rejects duplicate component and custom identifiers across nesting", () => {
    const duplicateIds = validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [text("One", { id: 7 }), text("Two", { id: 7 })],
    }));
    expect(duplicateIds).toMatchObject({ rule: "unique-component-id" });

    const row = (customId: string) => actionRow({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId,
      label: "Open",
    });
    const duplicateCustomIds = validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [row("same"), row("same")],
    }));
    expect(duplicateCustomIds).toMatchObject({ rule: "unique-custom-id" });
  });

  it("rejects incompatible body fields and a missing Components V2 flag", () => {
    expect(validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [text("Body")],
      content: "legacy",
    } as never)).rule).toBe("v2-incompatible-field");
    expect(validationError(() => validateV2Message({
      flags: 0,
      components: [text("Body")],
    } as never)).rule).toBe("components-v2-flag");
  });

  it("accepts only Discord reset values when migrating an existing message", () => {
    expect(validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [text("Body")],
      content: null,
      embeds: [],
      stickers: [],
    })).toMatchObject({ content: null, embeds: [], stickers: [] });

    validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [text("Body")],
      poll: null,
    } as never);

    validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [text("Body")],
      sticker_ids: [],
    } as never);
    expect(validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [text("Body")],
      sticker_ids: ["123"],
    } as never)).rule).toBe("v2-incompatible-field");
    expect(validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2,
      components: [text("Body")],
      shared_client_theme: {},
    } as never)).rule).toBe("v2-incompatible-field");
  });

  it("rejects flags that cannot be set by supported Components V2 endpoints", () => {
    expect(validationError(() => validateV2Message({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Urgent,
      components: [text("Body")],
    } as never)).rule).toBe("message-flags");
  });
});
