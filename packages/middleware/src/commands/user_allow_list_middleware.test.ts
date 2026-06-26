import { createMockCommandContext } from "arcscord/testing";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { CommandUserAllowListMiddleware } from "./user_allow_list_middleware";

function createContext(options: Parameters<typeof createMockCommandContext>[0] = {}) {
  return createMockCommandContext({
    ...options,
    mockFunction: implementation => vi.fn(implementation),
  });
}

describe("commandUserAllowListMiddleware", () => {
  it("continues when the user is allowed", () => {
    const middleware = new CommandUserAllowListMiddleware([" user_1 "], {
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
    const middleware = new CommandUserAllowListMiddleware(["user_1"], {
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
      flags: MessageFlags.Ephemeral,
    });
  });

  it("supports localized callback messages", async () => {
    const translate = vi.fn((key: string) => `translated:${key}`);
    const middleware = new CommandUserAllowListMiddleware(["user_1"], ({ ctx, locale, t: fixedT }) => ({
      content: `${locale}:${ctx.user.id}:${fixedT("middleware.not_allowed")}`,
    }));
    const ctx = createContext({
      locale: "fr",
      t: translate as never,
      userId: "user_2",
    });

    const result = middleware.run(ctx);

    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(ctx.reply).toHaveBeenCalledWith({
      content: "fr:user_2:translated:middleware.not_allowed",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("cancels with an edit reply when the interaction is deferred", async () => {
    const middleware = new CommandUserAllowListMiddleware(["user_1"], {
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
