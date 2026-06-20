import { createMockComponentContext } from "arcscord/testing";
import { describe, expect, it, vi } from "vitest";
import { ComponentUserAllowListMiddleware } from "./user_allow_list_middleware";

function createContext(options: Parameters<typeof createMockComponentContext>[0] = {}) {
  return createMockComponentContext({
    ...options,
    mockFunction: implementation => vi.fn(implementation),
  });
}

describe("componentUserAllowListMiddleware", () => {
  it("continues when the user is allowed", () => {
    const middleware = new ComponentUserAllowListMiddleware([" user_1 "], {
      content: "Not allowed",
    });

    expect(middleware.run(createContext({ userId: "user_1" }))).toEqual({
      cancel: null,
      error: null,
      next: {
        allowed: true,
      },
    });
  });

  it("cancels with a reply when the user is not allowed", async () => {
    const middleware = new ComponentUserAllowListMiddleware(["user_1"], {
      content: "Not allowed",
    });
    const ctx = createContext({ userId: "user_2" });

    const result = middleware.run(ctx);

    expect(result.next).toBeNull();
    expect(result.error).toBeNull();
    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(ctx.reply).toHaveBeenCalledWith({
      content: "Not allowed",
      ephemeral: true,
    });
  });

  it("cancels with an edit reply when the interaction is deferred", async () => {
    const middleware = new ComponentUserAllowListMiddleware(["user_1"], {
      content: "Not allowed",
    });
    const ctx = createContext({ defer: true, userId: "user_2" });

    const result = middleware.run(ctx);

    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(ctx.editReply).toHaveBeenCalledWith({
      content: "Not allowed",
    });
  });
});
