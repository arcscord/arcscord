import type { CommandInteraction } from "discord.js";
import type { DiagnosticLevel, DispatchErrorConfig } from "#/utils/error/dispatch.type";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createMockChatInputInteraction, createMockClient } from "#/testing";
import { ArcscordError, arcscordErrorCodes } from "#/utils";
import { BaseManager } from "./manager.class";

class TestManager extends BaseManager {
  async dispatchError(
    config: DispatchErrorConfig | undefined,
    error: ArcscordError,
    replyCtx?: {
      interaction: CommandInteraction;
      locale: string;
    },
    defaultLevel: DiagnosticLevel = "error",
  ): Promise<void> {
    await this.sendDispatchError(config, defaultLevel, error, replyCtx);
  }
}

function createDispatchError(): ArcscordError {
  return new ArcscordError({
    code: arcscordErrorCodes.CommandNotFound,
    message: "command not found",
    metadata: {},
  });
}

function createReplyContext(interaction: CommandInteraction) {
  return { interaction, locale: "fr" };
}

describe("base manager", () => {
  it("falls back to the default reply when a dispatch reply callback throws", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const interaction = createMockChatInputInteraction();
    const callbackError = new Error("reply callback boom");
    const fallbackMessage = { content: "Une erreur est survenue." };
    const error = createDispatchError();

    vi.mocked(client.getErrorMessage).mockReturnValue(fallbackMessage);

    await expect(manager.dispatchError({
      reply: () => {
        throw callbackError;
      },
    }, error, createReplyContext(interaction))).resolves.toBeUndefined();

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

  it("uses the default message and diagnostic level when no config is provided", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const interaction = createMockChatInputInteraction();
    const error = createDispatchError();
    const fallbackMessage = { content: "Une erreur est survenue." };

    vi.mocked(client.getErrorMessage).mockReturnValue(fallbackMessage);

    await manager.dispatchError(undefined, error, createReplyContext(interaction), "warn");

    expect(manager.logger.warn).toHaveBeenCalledWith(error.message, {
      incidentId: expect.any(String),
    });
    expect(client.getErrorMessage).toHaveBeenCalledWith(expect.any(String), "fr");
    expect(interaction.reply).toHaveBeenCalledWith({
      ...fallbackMessage,
      flags: MessageFlags.Ephemeral,
    });
  });

  it("does not build or send a reply when replies are disabled", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const interaction = createMockChatInputInteraction();

    await manager.dispatchError({ reply: false }, createDispatchError(), createReplyContext(interaction));

    expect(client.getErrorMessage).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("does not build or send a reply for a non-repliable interaction", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const interaction = createMockChatInputInteraction();
    const reply = vi.fn(() => ({ content: "Unavailable" }));

    vi.spyOn(interaction, "isRepliable").mockReturnValue(false);

    await manager.dispatchError({ reply }, createDispatchError(), createReplyContext(interaction));

    expect(reply).not.toHaveBeenCalled();
    expect(client.getErrorMessage).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("sends a static reply as ephemeral", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const interaction = createMockChatInputInteraction();
    const reply = { content: "Commande indisponible" };

    await manager.dispatchError({ reply }, createDispatchError(), createReplyContext(interaction));

    expect(client.getErrorMessage).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      ...reply,
      flags: MessageFlags.Ephemeral,
    });
  });

  it("passes dispatch context to a successful reply callback", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const interaction = createMockChatInputInteraction();
    const error = createDispatchError();

    await manager.dispatchError({
      reply: (context) => {
        expect(context.interaction).toBe(interaction);
        expect(context.error).toBe(error);
        expect(context.locale).toBe("fr");
        expect(context.t?.("errors.unavailable")).toBe("errors.unavailable");
        expect(context.logger).toBe(manager.logger);
        return { content: "Commande indisponible" };
      },
    }, error, createReplyContext(interaction));

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Commande indisponible",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("logs and absorbs an interaction reply failure", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const interaction = createMockChatInputInteraction();
    const replyError = new Error("Discord unavailable");

    vi.mocked(interaction.reply).mockRejectedValue(replyError);

    await expect(manager.dispatchError(
      { reply: { content: "Commande indisponible" } },
      createDispatchError(),
      createReplyContext(interaction),
    )).resolves.toBeUndefined();

    expect(manager.logger.error).toHaveBeenCalledWith("failed to send dispatch error reply", {
      baseError: replyError.message,
    });
  });

  it("does not try to reply without a reply context", async () => {
    const client = createMockClient();
    const manager = new TestManager(client, "test");
    const reply = vi.fn(() => ({ content: "Commande indisponible" }));

    await manager.dispatchError({ reply }, createDispatchError());

    expect(reply).not.toHaveBeenCalled();
    expect(client.getErrorMessage).not.toHaveBeenCalled();
  });
});
