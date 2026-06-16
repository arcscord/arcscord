import { stringifyUnknown } from "../src";

describe("stringifyUnknown", () => {
  it("should return 'null' for null value", () => {
    expect(stringifyUnknown(null)).toBe("null");
  });

  it("should return quoted string for string value", () => {
    expect(stringifyUnknown("test")).toBe("\"test\"");
  });

  it("should return string representation for number value", () => {
    expect(stringifyUnknown(123)).toBe("123");
  });

  it("should return string representation for bigint value", () => {
    expect(stringifyUnknown(BigInt(123))).toBe("123");
  });

  it("should return 'true' for boolean true", () => {
    expect(stringifyUnknown(true)).toBe("true");
  });

  it("should return 'false' for boolean false", () => {
    expect(stringifyUnknown(false)).toBe("false");
  });

  it("should return string representation for function", () => {
    const func = function () {};
    expect(stringifyUnknown(func)).toBe(func.toString());
  });

  it("should return string representation for symbol", () => {
    const sym = Symbol("test");
    expect(stringifyUnknown(sym)).toBe(sym.toString());
  });

  it("should return 'undefined' for undefined value", () => {
    expect(stringifyUnknown(undefined)).toBe("undefined");
  });

  it("should return JSON string for object", () => {
    const obj = { key: "value" };
    expect(stringifyUnknown(obj)).toBe(JSON.stringify(obj));
  });

  it("should return 'unknown' for circular object", () => {
    const obj: any = {};
    obj.self = obj;
    expect(stringifyUnknown(obj)).toBe("unknown");
  });

  it("should return 'unknown' for unknown type", () => {
    const unknownType = new (class {})();
    expect(stringifyUnknown(unknownType)).toBe("{}");
  });
});
