import { error, ok } from "@arcscord/error";
import { describe, expect, it } from "vitest";
import { normalizeHandlerReturn } from "./execution_exit";

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
});
