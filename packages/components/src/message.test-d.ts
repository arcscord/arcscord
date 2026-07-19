import type { InteractionEditReplyOptions, InteractionReplyOptions, MessageEditOptions } from "discord.js";
import type { MessageV2MigrationReplyOptions } from "./message";
import { ContainerBuilder, TextDisplayBuilder } from "discord.js";
import { describe, expectTypeOf, it } from "vitest";
import { v2Message } from "./message";

describe("v2Message public types", () => {
  it("stays compatible with Discord.js reply and edit methods", () => {
    const reply: InteractionReplyOptions = v2Message("Hello");
    const editReply: InteractionEditReplyOptions = v2Message(new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Hello"),
    ));
    const edit: MessageEditOptions = v2Message({ allowedMentions: { parse: [] } }, "Hello");
    const replyOnly: InteractionReplyOptions = v2Message({ ephemeral: true }, "Hello");
    const migration = v2Message({ content: null, embeds: [], poll: null, stickers: [] }, "Hello");
    expectTypeOf(migration).toEqualTypeOf<MessageV2MigrationReplyOptions>();
    void reply;
    void editReply;
    void edit;
    void replyOnly;
  });
});
