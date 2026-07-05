import { createMockComponentContext } from "arcscord/testing";
import { describe, expect, it, vi } from "vitest";
import { normalizeUserIds, resolveMessage } from "./utils";

describe("normalizeUserIds", () => {
  it("deduplicates repeated ids", () => {
    expect(normalizeUserIds(["1", "2", "1"])).toEqual(new Set(["1", "2"]));
  });

  it("trims surrounding whitespace from each id", () => {
    expect(normalizeUserIds([" 1 ", "2\n"])).toEqual(new Set(["1", "2"]));
  });

  it("filters out entries that are empty after trimming", () => {
    expect(normalizeUserIds(["1", "  ", ""])).toEqual(new Set(["1"]));
  });
});

describe("resolveMessage", () => {
  it("returns a static message unchanged", () => {
    const message = { content: "static" };
    const ctx = createMockComponentContext();

    expect(resolveMessage(message, ctx)).toBe(message);
  });

  it("invokes a message callback with ctx, locale, t, and any extra options", () => {
    const t = vi.fn((key: string) => `translated:${key}`);
    const ctx = createMockComponentContext({ locale: "fr", t: t as never });
    const callback = vi.fn(({ locale, t: fixedT, reason }: {
      ctx: unknown;
      locale: string;
      t: (key: string) => string;
      reason: string;
    }) => ({
      content: `${locale}:${reason}:${fixedT("key")}`,
    }));

    const result = resolveMessage(callback as never, ctx, { reason: "banned" } as never);

    expect(callback).toHaveBeenCalledWith({
      ctx,
      locale: "fr",
      t,
      reason: "banned",
    });
    expect(result).toEqual({ content: "fr:banned:translated:key" });
  });
});
