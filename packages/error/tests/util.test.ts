import { anyToError } from "../src";

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
