import { describe, expect, it, vi } from "vitest";
import { createMockButtonInteraction, createMockClient } from "#/testing";
import { ButtonContext } from "./button_context";

function makeButtonContext(customId = "btn") {
  const client = createMockClient();
  const interaction = createMockButtonInteraction({ customId });
  return new ButtonContext(client, interaction, { locale: "en" });
}

describe("buttonContext", () => {
  it("isButtonContext returns true", () => {
    expect(makeButtonContext().isButtonContext()).toBe(true);
  });

  it("isModalContext returns false", () => {
    expect(makeButtonContext().isModalContext()).toBe(false);
  });

  it("isSelectMenuContext returns false", () => {
    expect(makeButtonContext().isSelectMenuContext()).toBe(false);
  });

  it("isMessageComponentContext returns true", () => {
    expect(makeButtonContext().isMessageComponentContext()).toBe(true);
  });

  it("stores customId from interaction", () => {
    expect(makeButtonContext("my_button").customId).toBe("my_button");
  });

  it("sends follow-up replies through the shared repliable context", async () => {
    const ctx = makeButtonContext();
    const followUp = vi.fn(async () => ({}));
    ctx.interaction.followUp = followUp as unknown as typeof ctx.interaction.followUp;

    await expect(ctx.followUp("Done", { ephemeral: true })).resolves.toEqual([null, true]);
    expect(followUp).toHaveBeenCalledWith({ content: "Done", ephemeral: true });
    expect(ctx.hasReply).toBe(true);
  });

  it("normalizes follow-up failures", async () => {
    const ctx = makeButtonContext();
    ctx.interaction.followUp = vi.fn(async () => {
      throw new Error("Discord unavailable");
    }) as unknown as typeof ctx.interaction.followUp;

    const [failure] = await ctx.followUp("Done");

    expect(failure).toMatchObject({
      code: "INTERACTION_OPERATION_FAILED",
      metadata: { operation: "followUp" },
    });
    expect(ctx.hasReply).toBe(false);
  });
});
