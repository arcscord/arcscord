import type { Result, ResultErr, ResultOk } from "./type";
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
 * @param err - The error value.
 * @returns The error result.
 * @template E - The type of the error.
 */
export function error<E extends Error>(err: E): ResultErr<E> {
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

/**
 * A function that handles multiple `Result` values of different types.
 * If all results are successful, returns the success value of the last result.
 * If any result is an error, the first encountered error is returned.
 *
 * @param results - A list of `Result`s which can have different types for success and errors.
 * @returns A `Result` containing the last success or the first error.
 *
 * The success result type is inferred as the success type of the last argument.
 * The error result type is unified across all arguments.
 */
export function multiple<
  TLastSuccess,
  TLastError extends Error,
  TErrors extends Error[], // Tuple of all possible error types
>(
  ...results: [
    ...{ [K in keyof TErrors]: Result<unknown, TErrors[K]> },
    Result<TLastSuccess, TLastError>,
  ]
): Result<TLastSuccess, TErrors[number] | TLastError> {
  for (const result of results) {
    const [err] = result;
    if (err !== null) {
      return error(err);
    }
  }

  // If no errors, return last successful value
  const [lastErr, lastValue] = results[results.length - 1];

  if (lastErr !== null) {
    return error(lastErr);
  }

  return ok(lastValue as TLastSuccess);
}
