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
 * later operations are skipped as soon as one returns an error.
 *
 * This function does not catch callback throws. If a callback throws or returns
 * a rejected promise, that value propagates through the returned promise and
 * later callbacks are not executed. Wrap a callback with {@link forceSafe} when
 * its throws should be returned as a `ResultErr` instead.
 *
 * @param callbacks - Callbacks producing `Result`s, possibly of different types.
 * @returns A `Result` with the last success value or the first encountered error.
 *
 * The success type is inferred as the success type of the last callback. The
 * error type is unified across all callbacks. Callback throws are not represented
 * in the `Result` type because they propagate through the returned promise.
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
): Promise<Result<TLastSuccess, TErrors[number] | TLastError>> {
  let last: Result<unknown, NonNullish> = ok(true);
  for (const callback of callbacks) {
    const result = await callback();
    if (result[0] !== null) {
      return result as ResultErr<TErrors[number] | TLastError>;
    }
    last = result;
  }

  return last as ResultOk<TLastSuccess>;
}

/** Any callback accepted by {@link multipleParallel}, sync or async. @internal */
type AnyMultipleCallback = () => Result<unknown, NonNullish> | Promise<Result<unknown, NonNullish>>;

/** The awaited `Result` produced by a {@link multipleParallel} callback. @internal */
type CallbackResult<C> = C extends () => infer R ? Awaited<R> : never;

/** The success value type of a {@link multipleParallel} callback. @internal */
type CallbackValue<C> = Extract<CallbackResult<C>, ResultOk<unknown>> extends ResultOk<infer V> ? V : never;

/** The error type of a {@link multipleParallel} callback. @internal */
type CallbackError<C> = Extract<CallbackResult<C>, ResultErr<NonNullish>> extends ResultErr<infer E> ? E : never;

/**
 * Runs a list of `Result`-producing callbacks **in parallel** (like `Promise.all`)
 * and collects every success value into a tuple. Unlike {@link multiple}, all
 * callbacks start at once and are all awaited — nothing is short-circuited.
 *
 * On success, resolves with `ok([...values])` in callback order. If any callback
 * fails (returns an error), resolves with the **first error by position**. Every
 * callback still runs to completion, matching `Promise.all` execution semantics.
 *
 * This function does not catch callback throws. If a callback throws or returns
 * a rejected promise, that value propagates through the returned promise. Wrap a
 * callback with {@link forceSafe} when its throws should be returned as a
 * `ResultErr` instead.
 *
 * @param callbacks - Callbacks producing `Result`s, run concurrently.
 * @returns A `Result` with the tuple of all success values, or the first error.
 *
 * The success type is inferred as the tuple of each callback's success type. The
 * error type is unified across all callbacks. Callback throws are not represented
 * in the `Result` type because they propagate through the returned promise.
 */
export async function multipleParallel<T extends readonly AnyMultipleCallback[]>(
  ...callbacks: T
): Promise<Result<{ -readonly [K in keyof T]: CallbackValue<T[K]> }, CallbackError<T[number]>>> {
  const results = await Promise.all(callbacks.map(callback => Promise.resolve().then(callback)));

  const values: unknown[] = [];
  for (const [err, value] of results) {
    if (err !== null) {
      return error(err) as ResultErr<CallbackError<T[number]>>;
    }
    values.push(value);
  }

  return ok(values as { -readonly [K in keyof T]: CallbackValue<T[K]> });
}
