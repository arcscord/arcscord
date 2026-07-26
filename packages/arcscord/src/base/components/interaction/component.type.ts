import type { NonNullish, Result } from "@arcscord/error";

/**
 * Normalized internal result of running a component.
 * Used by the manager after normalizing the raw return value of `run()`.
 */
export type ComponentRunResult<E extends NonNullish = NonNullish> = Result<true | string, E>;

/**
 * All values a component `run()` function may return.
 *
 * The manager normalizes these into the component {@link ExecutionOutcome}:
 * - `void` / `undefined` → `ok(true)`
 * - `string` or `true` → `ok(value)`
 * - `Result<true | string, E>` → normalized as an expected failure or success
 */
export type ComponentRunReturn<E extends NonNullish = NonNullish>
  = | void
    | string
    | true
    | ComponentRunResult<E>;
