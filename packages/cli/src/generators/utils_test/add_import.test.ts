import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";
import { esmGenerate, esmTraverse } from "../../utils/esm.js";
import { addImport } from "../utils.js";

const baseCode = `import { test } from "test";`;

describe("addImport", () => {
  it("should add a new import when it does not exist", () => {
    const ast = parse(baseCode, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    esmTraverse(ast, {
      Program: addImport("./newModule", "newImport"),
    });

    const generatedCode = esmGenerate(ast).code;
    expect(generatedCode).toBe(`import { test } from "test";\nimport { newImport } from "./newModule";`);
  });

  it("should add a new specifier to an existing import", () => {
    const ast = parse(baseCode, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    esmTraverse(ast, {
      Program: addImport("test", "newSpecifier"),
    });

    const generatedCode = esmGenerate(ast).code;
    expect(generatedCode).toBe(`import { test, newSpecifier } from "test";`);
  });

  it("should not add a duplicate import specifier", () => {
    const ast = parse(baseCode, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    esmTraverse(ast, {
      Program: addImport("test", "test"),
    });
    const generatedCode = esmGenerate(ast).code;
    expect(generatedCode).toBe(`import { test } from "test";`);
  });

  it("should call the callback with correct values when import does not exist", () => {
    const ast = parse(baseCode, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    let callbackCalled = false;
    esmTraverse(ast, {
      Program: addImport("./newModule", "newImport", (importExist, importNameExist) => {
        expect(importExist).toBe(null);
        expect(importNameExist).toBe(null);
        callbackCalled = true;
      }),
    });

    expect(callbackCalled).toBe(true);
  });

  it("should call the callback with correct values when import path exists but specifier does not", () => {
    const ast = parse(baseCode, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    let callbackCalled = false;
    esmTraverse(ast, {
      Program: addImport("test", "newSpecifier", (importExist, importNameExist) => {
        expect(importExist).toBe(true);
        expect(importNameExist).toBe(null);
        callbackCalled = true;
      }),
    });

    expect(callbackCalled).toBe(true);
  });

  it("should call the callback with correct values when import specifier already exists", () => {
    const ast = parse(baseCode, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    let callbackCalled = false;
    esmTraverse(ast, {
      Program: addImport("test", "test", (importExist, importNameExist) => {
        expect(importExist).toBe(null);
        expect(importNameExist).toBe(true);
        callbackCalled = true;
      }),
    });

    expect(callbackCalled).toBe(true);
  });
});
