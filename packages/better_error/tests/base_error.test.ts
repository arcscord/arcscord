import { BaseError } from "../src";

describe("baseError", () => {
  it("should create an error with a message", () => {
    const error = new BaseError("Test error message");
    expect(error.message).toBe("Test error message");
    expect(error.name).toBe("baseError");
  });

  it("should create an error with custom options", () => {
    const options = {
      message: "Custom error message",
      name: "CustomError",
      customId: "12345",
      debugs: { key: "value" },
    };
    const error = new BaseError(options);
    expect(error.message).toBe("Custom error message");
    expect(error.name).toBe("CustomError");
    expect(error.id).toBe("12345");
    expect(error.getDebugsObject().key).toBe("value");
  });

  it("should generate an ID if autoGenerateId is true", () => {
    const options = {
      message: "Error with auto-generated ID",
      autoGenerateId: true,
    };
    const error = new BaseError(options);
    expect(error.id).toBeDefined();
  });

  it("should return the original error if provided", () => {
    const originalError = new Error("Original error");
    const options = {
      message: "Error with original error",
      originalError,
    };
    const error = new BaseError(options);
    expect(error.originalError).toBe(originalError);
  });

  it("should return a full message combining name and message", () => {
    const error = new BaseError("Test error message");
    expect(error.fullMessage()).toBe("baseError: Test error message");
  });

  it("should return debug information as a string", () => {
    const options = {
      message: "Error with debugs",
      debugs: { key: "value" },
    };
    const error = new BaseError(options);
    const debugString = error.getDebugString();
    expect(debugString.key).toBe("\"value\"");
  });

  it("should handle stack trace formatting", () => {
    const error = new BaseError("Error with stack trace");
    const stackDebugs = error.getStack("default");
    expect(stackDebugs.stack).toContain("Error: Error with stack trace");
  });
});
