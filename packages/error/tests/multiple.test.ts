import type { Result } from "../src";
import { describe, expect, it } from "vitest";
import { error, multiple, ok } from "../src";

class CustomError extends Error {}
class AnotherError extends Error {}

describe("multiple", () => {
  it("should return the last success if all results are successful", () => {
    const result = multiple(
      ok(1) as Result<number, Error>,
      ok("two") as Result<string, Error>,
      ok(true) as Result<boolean, CustomError>,
    );
    expect(result).toEqual(ok(true));
  });

  it("should return the first encountered error if any results are errors", () => {
    const result = multiple(
      ok(1) as Result<number, Error>,
      error(new CustomError("error occurred")) as Result<null, CustomError>,
      ok(true) as Result<boolean, AnotherError>,
    );
    expect(result).toEqual(error(new CustomError("error occurred")));
  });

  it("should return the first encountered error among multiple errors", () => {
    const result = multiple(
      ok(1) as Result<number, Error>,
      error(new CustomError("first error")) as Result<null, CustomError>,
      error(new AnotherError("second error")) as Result<null, AnotherError>,
    );
    expect(result).toEqual(error(new CustomError("first error")));
  });

  it("should handle a mixture of success and error results correctly", () => {
    const result = multiple(
      ok(1) as Result<number, CustomError>,
      error(new AnotherError("another error")) as Result<null, AnotherError>,
      ok(true) as Result<boolean, Error>,
    );
    expect(result).toEqual(error(new AnotherError("another error")));
  });

  it("should return the last success in case of no errors", () => {
    const result = multiple(
      ok("initial") as Result<string, Error>,
      ok(42) as Result<number, Error>,
      ok({ key: "value" }) as Result<object, CustomError>,
    );
    expect(result).toEqual(ok({ key: "value" }));
  });

  it("should return the specific error type when only one type of error is present", () => {
    const result = multiple(
      error(new CustomError("single error type")) as Result<null, CustomError>,
    );
    expect(result).toEqual(error(new CustomError("single error type")));
  });

  it("should handle the last result being an error", () => {
    const result = multiple(
      ok(1) as Result<number, CustomError>,
      ok("two") as Result<string, AnotherError>,
      ok(true) as Result<boolean, Error>,
      error(new CustomError("last error")) as Result<null, CustomError>,
    );
    expect(result).toEqual(error(new CustomError("last error")));
  });
});
