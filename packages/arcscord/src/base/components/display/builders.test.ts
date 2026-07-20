import { ComponentType } from "discord-api-types/v10";
import { MessageFlags } from "discord.js";
import { describe, expect, it } from "vitest";
import { button } from "../shared/builders";
import {
  accessory,
  actionRow,
  container,
  file,
  mediaGallery,
  section,
  separator,
  text,
  thumbnail,
  v2Message,
} from "./builders";

describe("display builders", () => {
  describe("text", () => {
    it("creates a text display component", () => {
      expect(text("Hello")).toMatchObject({
        type: ComponentType.TextDisplay,
        content: "Hello",
      });
    });
  });

  describe("separator", () => {
    it("creates a separator component with defaults", () => {
      expect(separator()).toMatchObject({
        type: ComponentType.Separator,
      });
    });

    it("converts string spacing to numeric enum value", () => {
      const result = separator({ divider: true, spacing: "large" });
      expect(result).toMatchObject({
        type: ComponentType.Separator,
        divider: true,
        spacing: 2,
      });
    });
  });

  describe("actionRow", () => {
    it("wraps buttons in an action row", () => {
      const btn = button({ customId: "btn_1", style: "primary", label: "Click" });
      const row = actionRow(btn);
      expect(row.type).toBe(ComponentType.ActionRow);
      expect(row.components).toHaveLength(1);
      expect(row.components[0]).toMatchObject({
        type: ComponentType.Button,
        customId: "btn_1",
      });
    });

    it("accepts up to 5 buttons", () => {
      const btn = button({ customId: "b", style: "secondary", label: "B" });
      const row = actionRow(btn, btn, btn, btn, btn);
      expect(row.components).toHaveLength(5);
    });
  });

  describe("thumbnail", () => {
    it("creates a thumbnail component", () => {
      const media = { url: "https://example.com/img.png" };
      expect(thumbnail({ media })).toMatchObject({
        type: ComponentType.Thumbnail,
        media,
      });
    });
  });

  describe("file", () => {
    it("creates a file component", () => {
      expect(file({ file: { url: "attachment://file.txt" } })).toMatchObject({
        type: ComponentType.File,
      });
    });
  });

  describe("mediaGallery", () => {
    it("creates a media gallery component", () => {
      expect(mediaGallery({ items: [{ media: { url: "https://example.com/img.png" } }] })).toMatchObject({
        type: ComponentType.MediaGallery,
      });
    });
  });

  describe("section", () => {
    it("creates a section with text and button accessory", () => {
      const btn = button({ customId: "btn", style: "primary", label: "Open" });
      const result = section("Hello", accessory(btn));
      expect(result).toMatchObject({
        type: ComponentType.Section,
        components: [{ type: ComponentType.TextDisplay, content: "Hello" }],
      });
      expect(result.accessory).toMatchObject({ type: ComponentType.Button });
    });

    it("throws when the last argument is not an accessory", () => {
      expect(() => {
        (section as (...args: unknown[]) => unknown)("Hello", "World");
      }).toThrow("section requires accessory(...) as its last argument");
    });
  });

  describe("container", () => {
    it("wraps children in a container", () => {
      const result = container("Hello", separator());
      expect(result).toMatchObject({
        type: ComponentType.Container,
      });
      expect(result.components).toHaveLength(2);
    });

    it("converts string children to text displays", () => {
      const result = container("line 1");
      expect(result.components[0]).toMatchObject({
        type: ComponentType.TextDisplay,
        content: "line 1",
      });
    });
  });

  describe("v2Message", () => {
    it("sets IsComponentsV2 flag", () => {
      const result = v2Message("Hello");
      expect(Number(result.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
    });

    it("converts string children to text display components", () => {
      const result = v2Message("Hello", "World");
      expect(result.components).toHaveLength(2);
      expect(result.components[0]).toMatchObject({ type: ComponentType.TextDisplay, content: "Hello" });
      expect(result.components[1]).toMatchObject({ type: ComponentType.TextDisplay, content: "World" });
    });

    it("accepts options as first argument", () => {
      const result = v2Message({ flags: MessageFlags.Ephemeral }, "Hello");
      expect(Number(result.flags) & MessageFlags.Ephemeral).toBeTruthy();
      expect(Number(result.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
    });

    it("accepts action rows as children", () => {
      const btn = button({ customId: "b", style: "primary", label: "B" });
      const row = actionRow(btn);
      const result = v2Message(row);
      expect(result.components[0]).toMatchObject({ type: ComponentType.ActionRow });
    });
  });
});
