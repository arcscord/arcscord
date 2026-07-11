import type { ArcscordError } from "#/utils/error/arcscord_error";
import type { DiagnosticLevel } from "#/utils/error/dispatch.type";
import type { DebugValues } from "#/utils/error/error.type";
import type { LoggerInterface } from "#/utils/logger/logger.type";

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
  err: ArcscordError,
  meta?: DebugValues,
): void {
  switch (level) {
    case "ignore":
      return;
    case "debug":
      logger.debug(err.message, meta);
      return;
    case "info":
      logger.info(err.message, meta);
      return;
    case "warn":
      logger.warn(err.message, meta);
      return;
    case "error":
      logger.logError(err, meta);
      return;
    case "throw":
      throw err;
  }
}
