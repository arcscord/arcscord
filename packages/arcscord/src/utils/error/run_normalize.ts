import type { BaseError } from "@arcscord/better-error";
import type { Result } from "@arcscord/error";
import type { DiagnosticLevel } from "#/utils/error/dispatch.type";
import type { LoggerInterface } from "#/utils/logger/logger.type";
import { ok } from "@arcscord/error";

/**
 * Returns `true` when `value` is an Arcscord `Result` tuple — either
 * `[null, T]` (ok) or `[Error, null]` (error).
 *
 * Used by {@link normalizeRunReturn} to distinguish a `Result` from a raw
 * return value such as `true` or a plain string.
 */
export function isArcscordResult(value: unknown): value is Result<unknown, Error> {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  const [first, second] = value as [unknown, unknown];
  if (first === null) {
    return true;
  }
  if (first instanceof Error && second === null) {
    return true;
  }
  return false;
}

/**
 * Normalizes the return value of a `run()` function to a `Result`.
 *
 * Accepted inputs:
 * - `void` / `undefined` → `ok(true)`
 * - `string` or `true` → `ok(value)`
 * - `Result<T, E>` → returned as-is
 *
 * This allows handler authors to omit the return statement, return a plain
 * value, or return an explicit `ok(...)` / `error(...)` with full type safety.
 */
export function normalizeRunReturn<T extends string | true, E extends Error>(
  value: void | T | Result<T, E>,
): Result<T | true, E> {
  if (value === undefined || value === null) {
    return ok(true);
  }
  if (isArcscordResult(value)) {
    return value as Result<T, E>;
  }
  return ok(value as T);
}

/**
 * Applies a {@link DiagnosticLevel} to the logger for the given error.
 *
 * For `"throw"`, the error is rethrown immediately after being stamped with
 * an ID. For all other levels the function returns normally.
 *
 * @internal
 */
export function applyDiagnosticLevel(
  logger: LoggerInterface,
  level: DiagnosticLevel,
  err: BaseError,
): void {
  switch (level) {
    case "ignore":
      return;
    case "debug":
      logger.debug(err.message);
      return;
    case "info":
      logger.info(err.message);
      return;
    case "warn":
      logger.warning(err.message);
      return;
    case "error":
      err.generateId();
      logger.logError(err);
      return;
    case "throw":
      err.generateId();
      throw err;
  }
}
