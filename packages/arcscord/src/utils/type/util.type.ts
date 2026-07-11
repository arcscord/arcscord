/** A value of type `T` that may be provided either synchronously or as a `Promise`. */
export type MaybePromise<T> = T | Promise<T>;

/**
 * `T` with the properties in `K` made optional while all others stay required.
 *
 * @typeParam T - The source object type.
 * @typeParam K - The keys of `T` to make optional.
 */
export type OptionalProperties<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
