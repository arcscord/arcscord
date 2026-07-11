import { createMockCommandContext } from "arcscord/testing";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { CommandBotPermissionMiddleware } from "./bot_permission_middleware";

function createContext(options: Parameters<typeof createMockCommandContext>[0] = {}) {
  return createMockCommandContext({
    ...options,
    mockFunction: implementation => vi.fn(implementation),
  });
}

describe("commandBotPermissionMiddleware", () => {
  it("continues when the bot has every required permission", () => {
    const middleware = new CommandBotPermissionMiddleware(["ManageMessages", "BanMembers"], () => ({
      content: "Missing permissions",
    }));
    const ctx = createContext({
      interaction: {
        appPermissions: ["ManageMessages", "BanMembers"],
        guild: {} as never,
      },
    });

    expect(middleware.run(ctx)).toEqual({
      status: "next",
      value: {
        allowed: true,
      },
    });
  });

  it("cancels with a reply when permissions are missing", async () => {
    const middleware = new CommandBotPermissionMiddleware(["ManageMessages", "BanMembers"], ({ missingPermissions }) => ({
      content: `Missing: ${missingPermissions.join(", ")}`,
    }));
    const ctx = createContext({
      interaction: {
        appPermissions: ["ManageMessages"],
        guild: {} as never,
      },
    });

    const result = middleware.run(ctx);

    expect(result.status).toBe("cancel");
    if (result.status !== "cancel")
      throw new Error("expected cancellation");
    await result.result;
    expect(ctx.reply).toHaveBeenCalledWith({
      content: "Missing: BanMembers",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("passes locale helpers to the message callback", async () => {
    const translate = vi.fn((key: string, options?: { count?: number }) => `${key}:${options?.count ?? 0}`);
    const middleware = new CommandBotPermissionMiddleware(["ManageMessages", "BanMembers"], ({ ctx, locale, missingPermissions, t: fixedT }) => ({
      content: `${locale}:${ctx.user.id}:${fixedT("middleware.missing", { count: missingPermissions.length })}`,
    }));
    const ctx = createContext({
      locale: "fr",
      t: translate as never,
      interaction: {
        appPermissions: [],
        guild: {} as never,
      },
    });

    const result = middleware.run(ctx);

    expect(result.status).toBe("cancel");
    if (result.status !== "cancel")
      throw new Error("expected cancellation");
    await result.result;
    expect(ctx.reply).toHaveBeenCalledWith({
      content: "fr:user_1:middleware.missing:2",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("cancels with an edit reply when the interaction is deferred", async () => {
    const middleware = new CommandBotPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `Missing: ${missingPermissions.join(", ")}`,
    }));
    const ctx = createContext({
      defer: true,
      interaction: {
        appPermissions: [],
        guild: {} as never,
      },
    });

    const result = middleware.run(ctx);

    expect(result.status).toBe("cancel");
    if (result.status !== "cancel")
      throw new Error("expected cancellation");
    await result.result;
    expect(ctx.editReply).toHaveBeenCalledWith({
      content: "Missing: ManageMessages",
    });
  });

  it("continues outside guild interactions", () => {
    const middleware = new CommandBotPermissionMiddleware(["ManageMessages"], () => ({
      content: "Missing permissions",
    }));
    const ctx = createContext({
      interaction: {
        appPermissions: [],
        guild: null,
      },
    });

    expect(middleware.run(ctx)).toEqual({
      status: "next",
      value: {
        allowed: true,
      },
    });
  });
});
