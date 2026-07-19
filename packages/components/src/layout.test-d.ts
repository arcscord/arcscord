import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { ButtonBuilder, ContainerBuilder } from "discord.js";
import { describe, it } from "vitest";
import { container } from "./container";
import { accessory, section } from "./section";
import { validateContainer } from "./validation";

describe("layout public types", () => {
  it("rejects invalid nesting before runtime", () => {
    const button = {
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      custom_id: "invalid-child",
    } as const;

    // @ts-expect-error A section accessory must be wrapped with accessory(...).
    section("Text", button);
    // @ts-expect-error A button builder is only accepted through an action row or section accessory.
    container(new ButtonBuilder());
    // @ts-expect-error Discord does not permit nested containers.
    container("Outer", new ContainerBuilder());
    // @ts-expect-error Complete containers are normalized explicitly with validateContainer().
    container(new ContainerBuilder());

    section("Text", accessory(button));
    validateContainer(new ContainerBuilder().addTextDisplayComponents({ type: ComponentType.TextDisplay, content: "Text" }));
  });
});
