import type { Result } from "@arcscord/error";
import type { ComponentError } from "#/utils";

/**
 * Normalized internal result of running a component.
 * Used by the manager after normalizing the raw return value of `run()`.
 */
export type ComponentRunResult = Result<true | string, ComponentError>;

/**
 * All values a component `run()` function may return.
 *
 * The manager normalizes these to a {@link ComponentRunResult} before calling
 * the result handler:
 * - `void` / `undefined` → `ok(true)`
 * - `string` or `true` → `ok(value)`
 * - `Result<true | string, ComponentError>` → returned as-is
 */
export type ComponentRunReturn
  = | void
    | string
    | true
    | ComponentRunResult;
