/**
 * Any value except `null` and `undefined` — the contract for an error slot.
 *
 * An error `Result` must always carry a meaningful, non-nullish error value,
 * otherwise it becomes indistinguishable from a success (`[null, ...]`).
 */
export type NonNullish = NonNullable<unknown>;

/**
 * A type that encapsulates either a successful value or an error.
 *
 * @template T - The type of the successful value.
 * @template E - The type of the error value (never `null`/`undefined`).
 */
export type Result<T, E extends NonNullish = NonNullish> = ResultOk<T> | ResultErr<E>;

/**
 * A type representing a successful result containing a value of type T.
 *
 * @template T - The type of the successful value.
 */
export type ResultOk<T> = [error: null, value: T];

/**
 * A type representing a result that contains an error.
 *
 * @template E - The type of the error (never `null`/`undefined`).
 */
export type ResultErr<E extends NonNullish = NonNullish> = [error: E, value: null];
