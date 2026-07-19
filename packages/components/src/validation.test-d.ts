import type { APITextDisplayComponent } from "discord-api-types/v10";
import type { TextDisplayComponentData } from "discord.js";
import type { CanonicalButtonComponentData, MessageActionRow } from "./action-row";
import type { CanonicalComponentData } from "./component";
import type { MessageV2EditReplyOptions, MessageV2MigrationReplyOptions, MessageV2ReplyOptions } from "./message";
import { ButtonStyle, ComponentType, MessageFlags } from "discord-api-types/v10";
import { TextDisplayBuilder } from "discord.js";
import { describe, expectTypeOf, it } from "vitest";
import { v2Message } from "./message";
import { validateActionRow, validateButton, validateTextDisplay, validateV2Message } from "./validation";

describe("validator public types", () => {
  it("returns canonical Discord.js data", () => {
    const builder = new TextDisplayBuilder().setContent("Builder");
    const raw = { type: 10, content: "Raw" } as APITextDisplayComponent;
    expectTypeOf(validateTextDisplay(builder)).toEqualTypeOf<CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>>();
    expectTypeOf(validateTextDisplay(raw)).toEqualTypeOf<CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>>();

    const button = validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId: "save",
      label: "Save",
    });
    expectTypeOf(button).toEqualTypeOf<CanonicalButtonComponentData>();

    const row = validateActionRow({
      type: ComponentType.ActionRow,
      components: [{
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        customId: "save",
        label: "Save",
      }],
    });
    expectTypeOf(row).toEqualTypeOf<MessageActionRow>();

    const message = v2Message("Body");
    expectTypeOf(validateV2Message(message)).toEqualTypeOf<MessageV2EditReplyOptions>();

    const reply = validateV2Message({
      components: ["Body"],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true,
    });
    expectTypeOf(reply).toEqualTypeOf<MessageV2ReplyOptions>();

    const migration = validateV2Message({
      components: ["Body"],
      flags: MessageFlags.IsComponentsV2,
      content: null,
    });
    expectTypeOf(migration).toEqualTypeOf<MessageV2MigrationReplyOptions>();
  });
});
