import type { NonNullish, Result } from "./type";

/**
 * Checks whether a value has the shape of a `Result` tuple.
 *
 * A `Result` is a two-element tuple where at least one slot is `null`
 * (`ResultOk` is `[null, value]`, `ResultErr` is `[error, null]`). Since an error
 * value is never nullish, this reliably distinguishes a `Result` — including
 * `ok(null)` — from any other two-element array.
 *
 * @param value - The value to test.
 * @returns `true` if `value` is a `Result` tuple.
 */
export function isResult(value: unknown): value is Result<unknown, NonNullish> {
  return Array.isArray(value)
    && value.length === 2
    && (value[0] === null || value[1] === null);
}

/**
 * Converts any value to an Error object.
 *
 * @param obj - The value to be converted.
 * @returns The converted Error object.
 */
export function anyToError(obj: unknown): Error {
  try {
    if (obj instanceof Error) {
      return obj;
    }
    if (typeof obj === "string") {
      return new Error(obj);
    }

    if (typeof obj === "object") {
      return new Error(JSON.stringify(obj));
    }
    return new Error(String(obj));
  }
  catch {
    return new Error(String(obj));
  }
}
