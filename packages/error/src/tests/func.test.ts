import { describe, expect, it } from "vitest";
import { error, forceSafe, ok } from "../";

describe("result functions", () => {
  describe("ok function", () => {
    it("should return a ResultOk with the correct value", () => {
      const value = 42;
      const result = ok(value);
      expect(result).toEqual([null, value]);
    });
  });

  describe("error function", () => {
    it("should return a ResultErr with the correct error", () => {
      const err = new Error("Test error");
      const result = error(err);
      expect(result).toEqual([err, null]);
    });

    it("should accept a domain failure that does not extend Error", () => {
      const failure = { _tag: "MissingPermission", permission: "ManageGuild" } as const;
      const result = error(failure);

      expect(result).toEqual([failure, null]);
    });
  });

  describe("forceSafe function", () => {
    it("should return ResultOk on successful execution", async () => {
      const fn = async () => 42;
      const result = await forceSafe(fn);
      expect(result).toEqual([null, 42]);
    });

    it("should return ResultErr on execution error", async () => {
      const errorMessage = "Test error";
      const fn = async () => {
        throw new Error(errorMessage);
      };
      const result = await forceSafe(fn);
      expect(result).toEqual([new Error(errorMessage), null]);
    });
  });
});
