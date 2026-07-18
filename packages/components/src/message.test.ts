import { ComponentType, MessageFlags } from "discord-api-types/v10";
import { ContainerBuilder, TextDisplayBuilder } from "discord.js";
import { describe, expect, it } from "vitest";
import { container } from "./container";
import { v2Message } from "./message";

describe("v2Message", () => {
  it("sets Components V2 while preserving every resolvable flag", () => {
    const result = v2Message({ flags: [MessageFlags.Ephemeral, MessageFlags.SuppressNotifications] }, "Hello");
    expect(Number(result.flags) & MessageFlags.IsComponentsV2).toBeTruthy();
    expect(Number(result.flags) & MessageFlags.Ephemeral).toBeTruthy();
    expect(Number(result.flags) & MessageFlags.SuppressNotifications).toBeTruthy();
  });

  it("distinguishes a builder passed first from message options", () => {
    const builder = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Builder message"),
    );
    expect(v2Message(builder)).toMatchObject({
      components: [{ type: ComponentType.Container, components: [{ content: "Builder message" }] }],
    });
  });

  it("normalizes raw API objects recursively", () => {
    expect(v2Message({
      type: ComponentType.Container,
      accent_color: 0x123456,
      components: [{ type: ComponentType.TextDisplay, content: "Raw" }],
    })).toMatchObject({
      components: [{ accentColor: 0x123456, components: [{ content: "Raw" }] }],
    });
  });

  it("accepts helper output", () => {
    expect(v2Message(container("Hello")).components).toHaveLength(1);
  });
});
