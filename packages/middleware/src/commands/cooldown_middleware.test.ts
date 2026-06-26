import { createMockCommandContext } from "arcscord/testing";
import { MessageFlags } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CooldownMiddleware } from "./cooldown_middleware";

function createContext(options: Parameters<typeof createMockCommandContext>[0] = {}) {
  return createMockCommandContext({
    ...options,
    mockFunction: implementation => vi.fn(implementation),
  });
}

describe("cooldownMiddleware", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("continues and stores the user cooldown on first run", () => {
    const middleware = new CooldownMiddleware(10, () => ({
      content: "Cooldown",
    }), false);
    const ctx = createContext({ userId: "user_1" });

    expect(middleware.run(ctx)).toEqual({
      cancel: null,
      error: null,
      next: {},
    });
    expect(middleware.users.get("user_1")).toBe(Date.now() + 10_000);
  });

  it("cancels with a localized reply while the cooldown is active", async () => {
    const translate = vi.fn((key: string, options?: { seconds?: number }) => `${key}:${options?.seconds ?? 0}`);
    const middleware = new CooldownMiddleware(10, ({ commandName, cooldownRemaining, ctx, locale, t: fixedT }) => ({
      content: `${locale}:${ctx.user.id}:${commandName}:${fixedT("middleware.cooldown", {
        seconds: Math.ceil(cooldownRemaining / 1000),
      })}`,
    }), false);
    const firstCtx = createContext({ userId: "user_1" });
    const secondCtx = createContext({
      locale: "fr",
      t: translate as never,
      interaction: {
        commandName: "ping",
      },
      userId: "user_1",
    });

    middleware.run(firstCtx);
    vi.advanceTimersByTime(1000);
    const result = await middleware.run(secondCtx);

    expect(result.next).toBeNull();
    expect(result.error).toBeNull();
    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(secondCtx.reply).toHaveBeenCalledWith({
      content: "fr:user_1:ping:middleware.cooldown:9",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("cancels with an edit reply when the interaction is deferred", async () => {
    const middleware = new CooldownMiddleware(10, ({ cooldownRemaining }) => ({
      content: `Wait ${Math.ceil(cooldownRemaining / 1000)}s`,
    }), false);
    const firstCtx = createContext({ userId: "user_1" });
    const secondCtx = createContext({ defer: true, userId: "user_1" });

    middleware.run(firstCtx);
    const result = await middleware.run(secondCtx);

    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(secondCtx.editReply).toHaveBeenCalledWith({
      content: "Wait 10s",
    });
  });

  it("continues after the cooldown expires", () => {
    const middleware = new CooldownMiddleware(10, () => ({
      content: "Cooldown",
    }), false);
    const ctx = createContext({ userId: "user_1" });

    middleware.run(ctx);
    vi.advanceTimersByTime(10_001);

    expect(middleware.run(ctx)).toEqual({
      cancel: null,
      error: null,
      next: {},
    });
  });
});
