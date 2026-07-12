import type { NonNullish, Result, ResultErr, ResultOk } from "../";
import { expectTypeOf, it } from "vitest";
import { error, isResult, multiple, ok } from "../";

it("ok wraps any value, including null and undefined", () => {
  expectTypeOf(ok(42)).toEqualTypeOf<ResultOk<number>>();
  expectTypeOf(ok(null)).toEqualTypeOf<ResultOk<null>>();
  expectTypeOf(ok(undefined)).toEqualTypeOf<ResultOk<undefined>>();
});

it("error accepts any non-nullish value", () => {
  expectTypeOf(error(new Error("x"))).toEqualTypeOf<ResultErr<Error>>();
  expectTypeOf(error("failed")).toEqualTypeOf<ResultErr<string>>();
  expectTypeOf(error(0)).toEqualTypeOf<ResultErr<number>>();
});

it("error rejects null and undefined error values", () => {
  // @ts-expect-error null is not a valid error value
  error(null);
  // @ts-expect-error undefined is not a valid error value
  error(undefined);
});

it("Result defaults its error type to NonNullish", () => {
  expectTypeOf<Result<number>>().toEqualTypeOf<Result<number, NonNullish>>();
});

it("Result / ResultErr reject a nullish error type parameter", () => {
  // @ts-expect-error null is not assignable to the NonNullish error constraint
  type _NullResult = Result<number, null>;
  // @ts-expect-error undefined is not assignable to the NonNullish error constraint
  type _UndefinedErr = ResultErr<undefined>;
});

it("isResult narrows an unknown value to a Result", () => {
  const value: unknown = ok(1);
  if (isResult(value)) {
    expectTypeOf(value).toEqualTypeOf<Result<unknown, NonNullish>>();
  }
});

it("multiple returns a Promise of the last success and the unified error", () => {
  const result = multiple(
    (): Result<number, Error> => ok(1),
    async (): Promise<Result<string, Error>> => ok("two"),
  );
  expectTypeOf(result).toEqualTypeOf<Promise<Result<string, Error>>>();
});
