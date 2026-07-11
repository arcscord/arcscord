import { describe, expect, it } from "vitest";
import { ArcscordError } from "./arcscord_error";
import { arcscordErrorCodes } from "./codes";

describe("arcscordError", () => {
  it("stores a stable code, typed metadata and native cause", () => {
    const cause = new Error("gateway failed");
    const error = new ArcscordError({
      code: arcscordErrorCodes.InteractionOperationFailed,
      message: "Failed to reply",
      metadata: { operation: "reply" },
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ArcscordError");
    expect(error.code).toBe("INTERACTION_OPERATION_FAILED");
    expect(error.metadata).toEqual({ operation: "reply" });
    expect(error.cause).toBe(cause);
  });
});
