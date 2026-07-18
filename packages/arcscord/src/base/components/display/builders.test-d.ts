import type {
  AnyMessageTopLevelComponentData,
  ComponentInContainer,
  Container,
  ContainerChild,
  ContainerComponentInput,
  File,
  FileComponentInput,
  MediaGallery,
  MediaGalleryComponentInput,
  MessageTopLevelComponent,
  MessageV2Child,
  MessageV2Component,
  Section,
  SectionComponentInput,
  Separator,
  SeparatorComponentInput,
  TextDisplay,
  TextDisplayInput,
  Thumbnail,
  ThumbnailInput,
} from "arcscord";
import type { InteractionEditReplyOptions, InteractionReplyOptions, MessageEditOptions } from "discord.js";
import { describe, expectTypeOf, it } from "vitest";
import { v2Message } from "./builders";

// These assignments mirror the real call sites (`ctx.reply`, `ctx.editReply`,
// `ctx.updateMessage`, `message.edit`). They only need to type-check.
describe("v2Message return types", () => {
  it("default payload is usable for reply, editReply and update/edit", () => {
    const reply: InteractionReplyOptions = v2Message("Hello");
    const editReply: InteractionEditReplyOptions = v2Message("Hello");
    const edit: MessageEditOptions = v2Message("Hello");
    void reply;
    void editReply;
    void edit;
  });

  it("edit-compatible options keep the universal payload", () => {
    const reply: InteractionReplyOptions = v2Message({ allowedMentions: { parse: [] } }, "Hello");
    const edit: MessageEditOptions = v2Message({ allowedMentions: { parse: [] } }, "Hello");
    void reply;
    void edit;
  });

  it("reply-only options still produce a reply payload", () => {
    const reply: InteractionReplyOptions = v2Message({ ephemeral: true }, "Hello");
    void reply;
  });
});

describe("legacy Arcscord Components V2 aliases", () => {
  it("redirects deprecated aliases to their modern Arcscord types", () => {
    expectTypeOf<AnyMessageTopLevelComponentData>().toEqualTypeOf<MessageV2Component>();
    expectTypeOf<ComponentInContainer>().toEqualTypeOf<ContainerChild>();
    expectTypeOf<Container>().toEqualTypeOf<ContainerComponentInput>();
    expectTypeOf<File>().toEqualTypeOf<FileComponentInput>();
    expectTypeOf<MediaGallery>().toEqualTypeOf<MediaGalleryComponentInput>();
    expectTypeOf<MessageTopLevelComponent>().toEqualTypeOf<MessageV2Child>();
    expectTypeOf<Section>().toEqualTypeOf<SectionComponentInput>();
    expectTypeOf<Separator>().toEqualTypeOf<SeparatorComponentInput>();
    expectTypeOf<TextDisplay>().toEqualTypeOf<TextDisplayInput>();
    expectTypeOf<Thumbnail>().toEqualTypeOf<ThumbnailInput>();
  });
});
