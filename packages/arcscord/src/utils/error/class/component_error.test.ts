import { describe, expect, it } from "vitest";
import { createMockButtonInteraction } from "#/testing";
import { ComponentError } from "./component_error";

describe("componentError", () => {
  it("exposes the interaction and sets its own name", () => {
    const interaction = createMockButtonInteraction({ customId: "greet" });
    const err = new ComponentError({ message: "boom", interaction });

    expect(err.name).toBe("ComponentError");
    expect(err.interaction).toBe(interaction);
  });

  it("still records the RunInfos debug entry inherited from InteractionError", () => {
    const interaction = createMockButtonInteraction({ customId: "greet" });
    const err = new ComponentError({ message: "boom", interaction });

    expect(String(err.getDebugsObject().RunInfos)).toContain("test-user");
  });

  it("supports custom debugs alongside the inherited RunInfos entry", () => {
    const interaction = createMockButtonInteraction({ customId: "greet" });
    const err = new ComponentError({
      message: "boom",
      interaction,
      debugs: { allowedValues: ["a", "b"] },
    });

    const debugs = err.getDebugsObject();
    expect(debugs.allowedValues).toEqual(["a", "b"]);
    expect(debugs.RunInfos).toBeDefined();
  });
});
