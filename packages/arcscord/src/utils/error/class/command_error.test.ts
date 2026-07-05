import { describe, expect, it } from "vitest";
import { commandInteractionToString } from "#/base/command";
import { createCommand } from "#/base/command/command_func";
import { createMockChatInputInteraction } from "#/testing";
import { CommandError } from "./command_error";

describe("commandError", () => {
  it("exposes interaction, context, and command from ctx", () => {
    const interaction = createMockChatInputInteraction({ commandName: "ping" });
    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: () => {},
    });
    const ctx = { interaction, command };

    const err = new CommandError({ message: "boom", ctx });

    expect(err.name).toBe("CommandError");
    expect(err.interaction).toBe(interaction);
    expect(err.context).toBe(ctx);
    expect(err.command).toBe(command);
  });

  it("records a Command debug entry built from commandInteractionToString", () => {
    const interaction = createMockChatInputInteraction({ commandName: "ping" });
    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: () => {},
    });
    const err = new CommandError({ message: "boom", ctx: { interaction, command } });

    expect(err.getDebugsObject().Command).toBe(commandInteractionToString(interaction));
  });

  it("still records the RunInfos debug entry inherited from InteractionError", () => {
    const interaction = createMockChatInputInteraction({ commandName: "ping" });
    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: () => {},
    });
    const err = new CommandError({ message: "boom", ctx: { interaction, command } });

    expect(String(err.getDebugsObject().RunInfos)).toContain("test-user");
  });
});
