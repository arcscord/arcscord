import type { Result } from "@arcscord/error";

/**
 * Normalized internal result of running a component.
 * Used by the manager after normalizing the raw return value of `run()`.
 */
export type ComponentRunResult<E = unknown> = Result<true | string, E>;

/**
 * All values a component `run()` function may return.
 *
 * The manager normalizes these to a {@link ComponentRunResult} before calling
 * the result handler:
 * - `void` / `undefined` → `ok(true)`
 * - `string` or `true` → `ok(value)`
 * - `Result<true | string, E>` → normalized as an expected failure or success
 */
export type ComponentRunReturn<E = unknown>
  = | void
    | string
    | true
    | ComponentRunResult<E>;
