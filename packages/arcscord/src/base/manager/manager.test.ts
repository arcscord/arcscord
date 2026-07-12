import type { CommandInteraction } from "discord.js";
import type { DispatchErrorConfig } from "#/utils/error/dispatch.type";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createMockChatInputInteraction, createMockClient } from "#/testing";
import { ArcscordError, arcscordErrorCodes } from "#/utils";
import { BaseManager } from "./manager.class";

class TestManager extends BaseManager {
  async dispatchError(
    config: DispatchErrorConfig,
    error: ArcscordError,
    interaction: CommandInteraction,
  ): Promise<void> {
    await this.sendDispatchError(config, "error", error, {
      interaction,
      locale: "fr",
    });
  }
}

describe("base manager", () => {
  it("falls back to the default reply when a dispatch reply callback throws", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const interaction = createMockChatInputInteraction();
    const callbackError = new Error("reply callback boom");
    const fallbackMessage = { content: "Une erreur est survenue." };
    const error = new ArcscordError({
      code: arcscordErrorCodes.CommandNotFound,
      message: "command not found",
      metadata: {},
    });

    vi.mocked(client.getErrorMessage).mockReturnValue(fallbackMessage);

    await expect(manager.dispatchError({
      reply: () => {
        throw callbackError;
      },
    }, error, interaction)).resolves.toBeUndefined();

    expect(client.getErrorMessage).toHaveBeenCalledWith(expect.any(String), "fr");
    expect(manager.logger.logError).toHaveBeenCalledWith(callbackError, {
      source: "dispatchMessageCallback",
      incidentId: expect.any(String),
    });
    expect(interaction.reply).toHaveBeenCalledWith({
      ...fallbackMessage,
      flags: MessageFlags.Ephemeral,
    });
  });
});
