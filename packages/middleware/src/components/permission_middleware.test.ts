import { createMockComponentContext } from "arcscord/testing";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { ComponentPermissionMiddleware } from "./permission_middleware";

function createContext(options: Parameters<typeof createMockComponentContext>[0] = {}) {
  return createMockComponentContext({
    ...options,
    mockFunction: implementation => vi.fn(implementation),
  });
}

describe("componentPermissionMiddleware", () => {
  it("continues when the member has every required permission", () => {
    const middleware = new ComponentPermissionMiddleware(["ManageMessages", "BanMembers"], () => ({
      content: "Missing permissions",
    }));
    const ctx = createContext({
      memberPermissions: ["ManageMessages", "BanMembers"],
    });

    expect(middleware.run(ctx)).toEqual({
      cancel: null,
      error: null,
      next: {
        allowed: true,
      },
    });
  });

  it("cancels with a reply when permissions are missing", async () => {
    const middleware = new ComponentPermissionMiddleware(["ManageMessages", "BanMembers"], ({ missingPermissions }) => ({
      content: `Missing: ${missingPermissions.join(", ")}`,
    }));
    const ctx = createContext({
      memberPermissions: ["ManageMessages"],
    });

    const result = middleware.run(ctx);

    expect(result.next).toBeNull();
    expect(result.error).toBeNull();
    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(ctx.reply).toHaveBeenCalledWith({
      content: "Missing: BanMembers",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("cancels with an edit reply when the interaction is deferred", async () => {
    const middleware = new ComponentPermissionMiddleware(["ManageMessages"], ({ missingPermissions }) => ({
      content: `Missing: ${missingPermissions.join(", ")}`,
    }));
    const ctx = createContext({
      defer: true,
      memberPermissions: [],
    });

    const result = middleware.run(ctx);

    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(ctx.editReply).toHaveBeenCalledWith({
      content: "Missing: ManageMessages",
    });
  });
});
