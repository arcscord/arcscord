import type { DebugValues, DebugValueString } from "#/utils/error/error.type";
import type { logLevels } from "#/utils/logger/logger.enum";

/**
 * @internal
 */
export type LogLevelInfo = {
  logText: string;

  titleColor: string;

  textColor: string;

  logPriority: number;
};

/**
 * The type representing the log levels.
 */
export type LogLevel = keyof typeof logLevels;

/**
 * Function type for logging, which accepts any data to be logged.
 */
export type LogFunc = (...data: unknown[]) => void;

/**
 * Options for a secondary diagnostic error output. Providing `diagnostics` with a
 * `loggerFunc` is what turns the sink on — there is no separate enabled flag to forget.
 */
export type DiagnosticLoggerOptions = {
  /**
   * Function used to write diagnostic reports.
   */
  loggerFunc: LogFunc;

  /**
   * Diagnostic output format.
   * @default "json"
   */
  format?: "pretty" | "json";
};

/**
 * Options for ArcLogger output and filtering.
 */
export type LoggerOptions = {
  /**
   * Minimum level to log.
   * @default process.env.ARCSCORD_LOG_LEVEL || process.env.LOG_LEVEL || "info"
   */
  level?: LogLevel | "warning";

  /**
   * Output format.
   * @default process.env.ARCSCORD_LOG_FORMAT || process.env.LOG_FORMAT || "pretty"
   */
  format?: "pretty" | "json";

  /**
   * Optional secondary output for full error diagnostics.
   */
  diagnostics?: DiagnosticLoggerOptions;

  /**
   * How much detail `logError`/`fatalError` print on the main sink: `"full"` includes the
   * stack trace and cause chain, `"short"` prints only the message, error id, and type.
   * @default "short" when `diagnostics` is configured, "full" otherwise
   */
  errorDetail?: "short" | "full";
};

/**
 * Constructor type for creating a LoggerInterface.
 */
export type LoggerConstructor = {
  new(name: string, logFunc?: LogFunc, options?: LoggerOptions): LoggerInterface;
};

/**
 * Interface representing a logger with various logging methods.
 *
 * Every level accepts an optional `meta` object so contextual fields (command name,
 * interactionId, guildId, ...) can be carried as structured data instead of being
 * concatenated into the message string. This is what makes it straightforward to
 * adapt to record-based loggers like pino or winston.
 */
export type LoggerInterface = {
  /**
   * Logs a trace message.
   * @param message - The message to be logged.
   * @param meta - Optional structured fields to attach to the log line.
   */
  trace: (message: string, meta?: DebugValues) => void;

  /**
   * Logs a debug message.
   * @param message - The message or a key-value pair to be logged.
   * @param meta - Optional structured fields to attach to the log line.
   */
  debug: (message: string | DebugValueString, meta?: DebugValues) => void;

  /**
   * Logs an informational message.
   * @param message - The message to be logged.
   * @param meta - Optional structured fields to attach to the log line.
   */
  info: (message: string, meta?: DebugValues) => void;

  /**
   * Logs a warning message.
   * @param message - The message to be logged.
   * @param meta - Optional structured fields to attach to the log line.
   */
  warn: (message: string, meta?: DebugValues) => void;

  /**
   * Logs an error message.
   * @param message - The message to be logged.
   * @param meta - Optional structured fields to attach to the log line.
   */
  error: (message: string, meta?: DebugValues) => void;

  /**
   * Logs an error object.
   * @param error - The error to be logged.
   * @param meta - Optional extra structured fields to merge alongside the error's own debug values.
   */
  logError: (error: unknown | unknown[], meta?: DebugValues) => void;

  /**
   * Logs a fatal-severity message. Does not halt execution by itself — a logger's job is to
   * log, not to decide whether the process should exit. Callers that need to stop after a
   * fatal error must throw or exit explicitly.
   * @param message - The message to be logged.
   * @param meta - Optional structured fields to attach to the log line.
   */
  fatal: (message: string, meta?: DebugValues) => void;

  /**
   * Logs a fatal error. Does not halt execution by itself, for the same reason as {@link fatal}.
   * @param error - The error to be logged.
   * @param meta - Optional extra structured fields to merge alongside the error's own debug values.
   */
  fatalError: (error: unknown, meta?: DebugValues) => void;

  /**
   * Logs a message at the specified log level.
   * @param level - The log level.
   * @param message - The message to be logged.
   * @param meta - Optional structured fields to attach to the log line.
   */
  log: (level: LogLevel, message: string, meta?: DebugValues) => void;

  /**
   * Returns a logger that automatically attaches `bindings` as `meta` on every subsequent call.
   * Optional: implementations that don't support it can omit it, callers should fall back to
   * the parent logger (`logger.child?.(bindings) ?? logger`).
   * @param bindings - Fields to bind on the returned logger.
   */
  child?: (bindings: DebugValues) => LoggerInterface;
};
