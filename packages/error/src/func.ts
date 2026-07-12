import type { NonNullish, Result, ResultErr, ResultOk } from "./type";
import { anyToError } from "./util";

/**
 * Wraps a value in a Result with a success status.
 *
 * @param value - The value to be wrapped.
 * @returns The Result object with success status and wrapped value.
 * @template T - The type of value to be wrapped.
 */
export function ok<T>(value: T): ResultOk<T> {
  return [null, value];
}

/**
 * Creates an error result.
 *
 * The error value must be non-nullish: `null`/`undefined` are rejected both at
 * compile time (via the {@link NonNullish} constraint) and at runtime, because a
 * `[null, null]` tuple would be read as a success by every consumer.
 *
 * @param err - The error value (never `null`/`undefined`).
 * @returns The error result.
 * @template E - The type of the error.
 * @throws {TypeError} When `err` is `null` or `undefined`.
 */
export function error<E extends NonNullish>(err: E): ResultErr<E> {
  if (err === null || err === undefined) {
    throw new TypeError("error() expects a non-nullish error value");
  }
  return [err, null];
}

/**
 * Executes a given function and returns a Result wrapping the result or an error.
 *
 * @param fn - The function to be executed.
 * @returns A promise that resolves to a Result.
 * @template T - The type of the result value.
 */
export async function forceSafe<T>(fn: (...args: unknown[]) => T | Promise<T>): Promise<Result<T, Error>> {
  try {
    const result = await fn();
    return ok(result);
  }
  catch (e) {
    return error(anyToError(e));
  }
}

/** A lazy producer of a `Result`, sync or async, run by {@link multiple}. */
export type MultipleCallback<T, E extends NonNullish> = () => Result<T, E> | Promise<Result<T, E>>;

/**
 * Runs a list of `Result`-producing callbacks sequentially, short-circuiting on
 * the first failure. Each callback runs only if every previous one succeeded, so
 * later operations are skipped as soon as one returns an error or throws.
 *
 * If a callback throws, the throw is wrapped into `error(anyToError(e))` (like
 * {@link forceSafe}) and the remaining callbacks are not executed.
 *
 * @param callbacks - Callbacks producing `Result`s, possibly of different types.
 * @returns A `Result` with the last success value or the first encountered error.
 *
 * The success type is inferred as the success type of the last callback. The
 * error type is unified across all callbacks (plus `Error` from wrapped throws).
 */
export async function multiple<
  TLastSuccess,
  TLastError extends NonNullish,
  TErrors extends NonNullish[], // Tuple of all possible error types
>(
  ...callbacks: [
    ...{ [K in keyof TErrors]: MultipleCallback<unknown, TErrors[K]> },
    MultipleCallback<TLastSuccess, TLastError>,
  ]
): Promise<Result<TLastSuccess, TErrors[number] | TLastError | Error>> {
  let last: Result<unknown, NonNullish> = ok(true);
  for (const callback of callbacks) {
    let result: Result<unknown, NonNullish>;
    try {
      result = await callback();
    }
    catch (e) {
      return error(anyToError(e));
    }
    if (result[0] !== null) {
      return result as ResultErr<TErrors[number] | TLastError>;
    }
    last = result;
  }

  return last as ResultOk<TLastSuccess>;
}
