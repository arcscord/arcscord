import { describe, expect, it } from "vitest";
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
});
