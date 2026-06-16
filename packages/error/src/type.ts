/**
 * A type that encapsulates either a successful value or an error.
 *
 * @template T - The type of the successful value.
 * @template E - The type of the error value.
 */
export type Result<T, E> = ResultOk<T> | ResultErr<E>;

/**
 * A type representing a successful result containing a value of type T.
 *
 * @template T - The type of the successful value.
 */
export type ResultOk<T> = [error: null, value: T];

/**
 * A type representing a result that contains an error.
 *
 * @template E - The type of the error.
 */
export type ResultErr<E> = [error: E, value: null];
