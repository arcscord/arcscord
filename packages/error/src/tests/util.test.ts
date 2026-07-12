import { describe, expect, it } from "vitest";
import { anyToError, error, isResult, ok } from "../";

describe("isResult function", () => {
  it("returns true for ok results, including ok(null)", () => {
    expect(isResult(ok(42))).toBe(true);
    expect(isResult(ok(null))).toBe(true);
  });

  it("returns true for error results", () => {
    expect(isResult(error(new Error("boom")))).toBe(true);
    expect(isResult(error({ _tag: "Denied" }))).toBe(true);
  });

  it("returns false for non-Result values", () => {
    expect(isResult(null)).toBe(false);
    expect(isResult("done")).toBe(false);
    expect(isResult([1])).toBe(false);
    expect(isResult([1, 2, 3])).toBe(false);
    // two non-null slots cannot be a Result (error slot is never nullish)
    expect(isResult([1, 2])).toBe(false);
    expect(isResult([undefined, null])).toBe(false);
    expect(isResult(["error", "value"])).toBe(false);
  });
});

describe("anyToError function", () => {
  it("should return the same Error object if input is an Error", () => {
    const err = new Error("Test error");
    expect(anyToError(err)).toBe(err);
  });

  it("should convert a string to an Error", () => {
    const str = "Test error";
    const result = anyToError(str);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(str);
  });

  it("should convert an object to an Error with JSON string", () => {
    const obj = { message: "Test error" };
    const result = anyToError(obj);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(JSON.stringify(obj));
  });

  it("should convert a number to an Error", () => {
    const num = 42;
    const result = anyToError(num);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(String(num));
  });
});
