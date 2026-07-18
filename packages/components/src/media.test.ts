import { ComponentType } from "discord-api-types/v10";
import { FileBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from "discord.js";
import { describe, expect, it } from "vitest";
import { file } from "./file";
import { normalizeFile } from "./internal/normalize-display";
import { mediaGallery } from "./media-gallery";
import { v2Message } from "./message";

describe("media components", () => {
  it("creates file data and normalizes FileBuilder", () => {
    expect(file({ file: { url: "attachment://file.txt" } })).toMatchObject({ type: ComponentType.File });
    expect(normalizeFile(new FileBuilder().setURL("attachment://builder.txt"))).toMatchObject({
      type: ComponentType.File,
      file: { url: "attachment://builder.txt" },
    });
  });

  it("normalizes gallery item builders", () => {
    expect(mediaGallery({
      items: [new MediaGalleryItemBuilder().setURL("https://example.com/item.png")],
    })).toMatchObject({
      type: ComponentType.MediaGallery,
      items: [{ media: { url: "https://example.com/item.png" } }],
    });
  });

  it("accepts complete file and media gallery builders as message children", () => {
    const gallery = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL("https://example.com/builder.png"),
    );
    expect(v2Message(new FileBuilder().setURL("attachment://builder.txt"), gallery)).toMatchObject({
      components: [
        { type: ComponentType.File, file: { url: "attachment://builder.txt" } },
        { type: ComponentType.MediaGallery, items: [{ media: { url: "https://example.com/builder.png" } }] },
      ],
    });
  });
});
