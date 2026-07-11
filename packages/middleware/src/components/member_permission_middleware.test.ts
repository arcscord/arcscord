import { createMockComponentContext } from "arcscord/testing";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { ComponentMemberPermissionMiddleware } from "./member_permission_middleware";

function createContext(options: Parameters<typeof createMockComponentContext>[0] = {}) {
  return createMockComponentContext({
    ...options,
    mockFunction: implementation => vi.fn(implementation),
  });
}

describe("componentMemberPermissionMiddleware", () => {
  it("continues when the member has every required permission", () => {
    const middleware = new ComponentMemberPermissionMiddleware(["ManageMessages", "BanMembers"], () => ({
      content: "Missing permissions",
    }));
    const ctx = createContext({
      memberPermissions: ["ManageMessages", "BanMembers"],
    });

    expect(middleware.run(ctx)).toEqual({
      status: "next",
      value: {
        allowed: true,
      },
    });
  });

  it("cancels with a reply when permissions are missing", async () => {
    const middleware = new ComponentMemberPermissionMiddleware(["ManageMessages", "BanMembers"], ({ missingPermissions }) => ({
      content: `Missing: ${missingPermissions.join(", ")}`,
    }));
    const ctx = createContext({
      memberPermissions: ["ManageMessages"],
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
    const middleware = new ComponentMemberPermissionMiddleware(["ManageMessages", "BanMembers"], ({ ctx, locale, missingPermissions, t: fixedT }) => ({
      content: `${locale}:${ctx.user.id}:${fixedT("middleware.missing", { count: missingPermissions.length })}`,
    }));
    const ctx = createContext({
      locale: "fr",
      memberPermissions: [],
      t: translate as never,
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

  it("treats every permission as missing when the interaction has no member permissions", async () => {
    const middleware = new ComponentMemberPermissionMiddleware(["ManageMessages", "BanMembers"], ({ missingPermissions }) => ({
      content: `Missing: ${missingPermissions.join(", ")}`,
    }));
    const ctx = createContext();

    const result = middleware.run(ctx);

    expect(result.status).toBe("cancel");
    if (result.status !== "cancel")
      throw new Error("expected cancellation");
    await result.result;
    expect(ctx.reply).toHaveBeenCalledWith({
      content: "Missing: ManageMessages, BanMembers",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("cancels with an edit reply when the interaction is deferred", async () => {
    const middleware = new ComponentMemberPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `Missing: ${missingPermissions.join(", ")}`,
    }));
    const ctx = createContext({
      defer: true,
      memberPermissions: [],
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
});
