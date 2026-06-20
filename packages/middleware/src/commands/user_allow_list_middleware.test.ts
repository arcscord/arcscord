import { describe, expect, it } from "vitest";
import { createMockCommandContext } from "../_test/context";
import { CommandUserAllowListMiddleware } from "./user_allow_list_middleware";

describe("commandUserAllowListMiddleware", () => {
  it("continues when the user is allowed", () => {
    const middleware = new CommandUserAllowListMiddleware([" user_1 "], {
      content: "Not allowed",
    });

    expect(middleware.run(createMockCommandContext({ userId: "user_1" }))).toEqual({
      cancel: null,
      error: null,
      next: {
        allowed: true,
      },
    });
  });

  it("cancels with a reply when the user is not allowed", async () => {
    const middleware = new CommandUserAllowListMiddleware(["user_1"], {
      content: "Not allowed",
    });
    const ctx = createMockCommandContext({ userId: "user_2" });

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
    const middleware = new CommandUserAllowListMiddleware(["user_1"], {
      content: "Not allowed",
    });
    const ctx = createMockCommandContext({ defer: true, userId: "user_2" });

    const result = middleware.run(ctx);

    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(ctx.editReply).toHaveBeenCalledWith({
      content: "Not allowed",
    });
  });
});
