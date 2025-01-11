import { describe, expect, it } from "vitest";
import { replaceI18nVariables } from "./i18n.js";

describe("replaceI18nVariables", () => {
  it("should replace simple variables", () => {
    const baseString = "commands.{{name}}.name";
    const patterns = { name: "greet" };
    const result = replaceI18nVariables(baseString, patterns);
    expect(result).toBe("commands.greet.name");
  });

  it("should replace path variable with only one folder", () => {
    const baseString = "commands.{{path.}}name";
    const patterns = { path: "folder" };
    const result = replaceI18nVariables(baseString, patterns);
    expect(result).toBe("commands.folder.name");
  });

  it("should replace path variables with custom separator", () => {
    const baseString = "commands.{{path/}}name";
    const patterns = { path: "folder/subfolder" };
    const result = replaceI18nVariables(baseString, patterns);
    expect(result).toBe("commands.folder/subfolder/name");
  });

  it("should replace path variables with different separator", () => {
    const baseString = "commands.{{path-}}name";
    const patterns = { path: "folder/subfolder" };
    const result = replaceI18nVariables(baseString, patterns);
    expect(result).toBe("commands.folder-subfolder-name");
  });

  it("should handle multiple replacements", () => {
    const baseString = "commands.{{name}}.{{path/}}description";
    const patterns = { name: "greet", path: "folder/subfolder" };
    const result = replaceI18nVariables(baseString, patterns);
    expect(result).toBe("commands.greet.folder/subfolder/description");
  });

  it("should return the original string if no patterns match", () => {
    const baseString = "commands.{{name}}.name";
    const patterns = { age: "30" };
    const result = replaceI18nVariables(baseString, patterns);
    expect(result).toBe("commands.{{name}}.name");
  });

  it("should handle empty patterns", () => {
    const baseString = "commands.{{name}}.name";
    const patterns = {};
    const result = replaceI18nVariables(baseString, patterns);
    expect(result).toBe("commands.{{name}}.name");
  });
});
