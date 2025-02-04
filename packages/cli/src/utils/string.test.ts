import { describe, expect, it } from "vitest";
import { camelOrPascalToSnakeCase } from "./string.js";

describe("string", () => {
  it("should convert camel case to snake case", () => {
    expect(camelOrPascalToSnakeCase("camelCase")).toBe("camel_case");
    expect(camelOrPascalToSnakeCase("PascalCase")).toBe("pascal_case");
    expect(camelOrPascalToSnakeCase("camelCase123")).toBe("camel_case123");
  });
});
