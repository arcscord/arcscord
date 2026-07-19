import * as standalone from "@arcscord/components";
import { describe, expect, it } from "vitest";
import {
  ArcscordError,
  arcscordErrorCodes,
  executionDefect,
  normalizeArcscordError,
} from "#/utils/error";
import * as display from "./index";

function captureError(run: () => unknown): unknown {
  try {
    run();
  }
  catch (error) {
    return error;
  }
  throw new Error("Expected the operation to throw");
}

describe("standalone components delegation", () => {
  it("re-exports the original helpers without replacing their identity", () => {
    expect(display.v2Message).toBe(standalone.v2Message);
    expect(display.container).toBe(standalone.container);
    expect(display.validateV2Message).toBe(standalone.validateV2Message);
  });

  it("preserves the standalone validation error for direct calls", () => {
    const thrown = captureError(() => display.text(""));
    expect(thrown).toBeInstanceOf(standalone.MessageComponentValidationError);
    expect(thrown).toMatchObject({
      rule: "string-length",
      path: "textDisplay.content",
      componentType: 10,
    });
  });

  it("normalizes validation failures explicitly when requested", () => {
    const standaloneError = captureError(() => display.validateTextDisplay(""));
    const normalized = normalizeArcscordError(standaloneError);

    expect(normalized).toBeInstanceOf(ArcscordError);
    expect(normalized).toMatchObject({
      code: arcscordErrorCodes.MessageComponentValidationFailed,
      metadata: {
        rule: "string-length",
        path: "textDisplay",
        componentType: 10,
      },
      cause: standaloneError,
    });
  });

  it("normalizes validation failures at the framework execution boundary", () => {
    const standaloneError = captureError(() => display.validateTextDisplay(""));
    const exit = executionDefect(standaloneError);

    expect(exit).toMatchObject({
      status: "defect",
      defect: {
        code: arcscordErrorCodes.MessageComponentValidationFailed,
        cause: standaloneError,
      },
    });
  });

  it("does not replace unrelated errors", () => {
    const unrelated = new Error("unrelated");
    expect(normalizeArcscordError(unrelated)).toBe(unrelated);
    expect(executionDefect(unrelated).defect).toBe(unrelated);
  });
});
