import type { APITextDisplayComponent } from "discord-api-types/v10";
import type { TextDisplayComponentData } from "discord.js";
import type { MessageComponentArcscordError } from "#/utils/error";
import type {
  CanonicalButtonComponentData,
  CanonicalComponentData,
  MessageActionRow,
  MessageV2EditReplyOptions,
} from "./types";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { TextDisplayBuilder } from "discord.js";
import { describe, expectTypeOf, it } from "vitest";
import { normalizeArcscordError } from "#/utils/error";
import {
  MessageComponentValidationError,
  v2Message,
  validateActionRow,
  validateButton,
  validateTextDisplay,
} from "./builders";

describe("adapted validator public types", () => {
  it("preserves helper overloads and returns canonical validator data", () => {
    const builder = new TextDisplayBuilder().setContent("Builder");
    const raw = { type: 10, content: "Raw" } as APITextDisplayComponent;
    expectTypeOf(validateTextDisplay(builder)).toEqualTypeOf<CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>>();
    expectTypeOf(validateTextDisplay(raw)).toEqualTypeOf<CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>>();
    expectTypeOf(validateButton({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      customId: "save",
      label: "Save",
    })).toEqualTypeOf<CanonicalButtonComponentData>();
    expectTypeOf(validateActionRow({
      type: ComponentType.ActionRow,
      components: [{
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        customId: "save",
        label: "Save",
      }],
    })).toEqualTypeOf<MessageActionRow>();
    expectTypeOf(v2Message("Body")).toMatchTypeOf<MessageV2EditReplyOptions>();

    const validationError = new MessageComponentValidationError({
      rule: "test",
      path: "component",
      message: "Invalid component",
    });
    expectTypeOf(normalizeArcscordError(validationError)).toEqualTypeOf<MessageComponentArcscordError>();
  });
});
