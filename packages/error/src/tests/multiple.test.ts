import type { Result } from "../";
import { describe, expect, it, vi } from "vitest";
import { error, multiple, multipleParallel, ok } from "../";

class CustomError extends Error {}
class AnotherError extends Error {}

describe("multiple", () => {
  it("should return the last success if all callbacks are successful", async () => {
    const result = await multiple(
      (): Result<number, Error> => ok(1),
      (): Result<string, Error> => ok("two"),
      (): Result<boolean, CustomError> => ok(true),
    );
    expect(result).toEqual(ok(true));
  });

  it("should return the first encountered error if any callback errors", async () => {
    const result = await multiple(
      (): Result<number, Error> => ok(1),
      (): Result<null, CustomError> => error(new CustomError("error occurred")),
      (): Result<boolean, AnotherError> => ok(true),
    );
    expect(result).toEqual(error(new CustomError("error occurred")));
  });

  it("should return the first encountered error among multiple errors", async () => {
    const result = await multiple(
      (): Result<number, Error> => ok(1),
      (): Result<null, CustomError> => error(new CustomError("first error")),
      (): Result<null, AnotherError> => error(new AnotherError("second error")),
    );
    expect(result).toEqual(error(new CustomError("first error")));
  });

  it("should await async callbacks", async () => {
    const result = await multiple(
      async (): Promise<Result<number, Error>> => ok(1),
      (): Result<boolean, CustomError> => ok(true),
    );
    expect(result).toEqual(ok(true));
  });

  it("should not run later callbacks once one errors", async () => {
    const later = vi.fn((): Result<boolean, Error> => ok(true));
    const result = await multiple(
      (): Result<null, CustomError> => error(new CustomError("stop here")),
      later,
    );
    expect(result).toEqual(error(new CustomError("stop here")));
    expect(later).not.toHaveBeenCalled();
  });

  it("should wrap a thrown value into an error and interrupt the rest", async () => {
    const later = vi.fn((): Result<boolean, Error> => ok(true));
    const result = await multiple(
      (): Result<number, Error> => {
        throw new Error("boom");
      },
      later,
    );
    expect(result).toEqual(error(new Error("boom")));
    expect(later).not.toHaveBeenCalled();
  });

  it("should handle a single erroring callback", async () => {
    const result = await multiple(
      (): Result<null, CustomError> => error(new CustomError("single error type")),
    );
    expect(result).toEqual(error(new CustomError("single error type")));
  });

  it("should handle the last callback being an error", async () => {
    const result = await multiple(
      (): Result<number, CustomError> => ok(1),
      (): Result<string, AnotherError> => ok("two"),
      (): Result<boolean, Error> => ok(true),
      (): Result<null, CustomError> => error(new CustomError("last error")),
    );
    expect(result).toEqual(error(new CustomError("last error")));
  });
});

describe("multipleParallel", () => {
  it("should collect every success value into a tuple, in order", async () => {
    const result = await multipleParallel(
      (): Result<number, Error> => ok(1),
      (): Result<string, Error> => ok("two"),
      (): Result<boolean, CustomError> => ok(true),
    );
    expect(result).toEqual(ok([1, "two", true]));
  });

  it("should run every callback even when one errors (unlike multiple)", async () => {
    const later = vi.fn((): Result<boolean, Error> => ok(true));
    const result = await multipleParallel(
      (): Result<null, CustomError> => error(new CustomError("boom")),
      later,
    );
    expect(result).toEqual(error(new CustomError("boom")));
    expect(later).toHaveBeenCalledTimes(1);
  });

  it("should return the first error by position", async () => {
    const result = await multipleParallel(
      (): Result<number, Error> => ok(1),
      (): Result<null, CustomError> => error(new CustomError("first")),
      (): Result<null, AnotherError> => error(new AnotherError("second")),
    );
    expect(result).toEqual(error(new CustomError("first")));
  });

  it("should wrap a thrown value into an error", async () => {
    const result = await multipleParallel(
      (): Result<number, Error> => {
        throw new Error("boom");
      },
      (): Result<boolean, Error> => ok(true),
    );
    expect(result).toEqual(error(new Error("boom")));
  });

  it("should await async callbacks", async () => {
    const result = await multipleParallel(
      async (): Promise<Result<number, Error>> => ok(1),
      async (): Promise<Result<string, Error>> => ok("two"),
    );
    expect(result).toEqual(ok([1, "two"]));
  });
});
