import { error, ok } from "@arcscord/error";
import { describe, expect, it } from "vitest";
import { isArcscordResult, normalizeHandlerReturn } from "./execution_exit";

describe("execution exits", () => {
  it("normalizes void and raw values as success", () => {
    expect(normalizeHandlerReturn(undefined)).toEqual({ status: "success", value: true });
    expect(normalizeHandlerReturn("done")).toEqual({ status: "success", value: "done" });
  });

  it("normalizes Result success and arbitrary failures", () => {
    const failure = { _tag: "Denied" } as const;
    expect(normalizeHandlerReturn(ok("done"))).toEqual({ status: "success", value: "done" });
    expect(normalizeHandlerReturn(error(failure))).toEqual({ status: "failure", failure });
  });

  it("recognizes valid Result tuple variants", () => {
    expect(isArcscordResult([null, true])).toBe(true);
    expect(isArcscordResult([{ _tag: "Denied" }, null])).toBe(true);
    // `[null, null]` is a valid `ok(null)` — at least one slot is null.
    expect(isArcscordResult([null, null])).toBe(true);
    // Two non-null slots cannot be a Result (error slot is never nullish).
    expect(isArcscordResult([1, 2])).toBe(false);
  });
});
