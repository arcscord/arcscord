import type { InteractionEditReplyOptions, InteractionReplyOptions, MessageEditOptions } from "discord.js";
import { describe, it } from "vitest";
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
