import type { BaseError } from "@arcscord/better-error";
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
 * Options for a secondary diagnostic error output.
 */
export type DiagnosticLoggerOptions = {
  /**
   * Enable the diagnostic sink.
   * @default false
   */
  enabled?: boolean;

  /**
   * Function used to write diagnostic reports.
   * If omitted, diagnostics are disabled even when enabled is true.
   */
  loggerFunc?: LogFunc;

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
  level?: LogLevel | "warn";

  /**
   * Output format.
   * @default process.env.ARCSCORD_LOG_FORMAT || process.env.LOG_FORMAT || "pretty"
   */
  format?: "pretty" | "json";

  /**
   * Optional secondary output for full error diagnostics.
   */
  diagnostics?: DiagnosticLoggerOptions;
};

/**
 * Constructor type for creating a LoggerInterface.
 */
export type LoggerConstructor = {
  new(name: string, logFunc?: LogFunc, options?: LoggerOptions): LoggerInterface;
};

/**
 * Interface representing a logger with various logging methods.
 */
export type LoggerInterface = {
  /**
   * Logs a trace message.
   * @param message - The message to be logged.
   */
  trace: (message: string) => void;

  /**
   * Logs a debug message.
   * @param message - The message or a key-value pair to be logged.
   */
  debug: (message: string | DebugValueString) => void;

  /**
   * Logs an informational message.
   * @param message - The message to be logged.
   */
  info: (message: string) => void;

  /**
   * Logs a warning message.
   * @param message - The message to be logged.
   */
  warning: (message: string) => void;

  /**
   * Logs an error message.
   * @param message - The message to be logged.
   * @param debugs - Optional debug values to include.
   */
  error: (
    message: string,
    debugs?: (string | DebugValueString)[] | DebugValues,
  ) => void;

  /**
   * Logs an error object.
   * @param error - The error to be logged.
   */
  logError: (error: BaseError | Error | unknown | unknown[]) => void;

  /**
   * Logs a fatal message and halts execution.
   * @param message - The message to be logged.
   * @param debugs - Optional debug values to include.
   */
  fatal: (
    message: string,
    debugs?: (string | DebugValueString)[] | DebugValues,
  ) => never;

  /**
   * Logs a fatal error and halts execution.
   * @param error - The error to be logged.
   */
  fatalError: (error: BaseError) => never;

  /**
   * Logs a message at the specified log level.
   * @param level - The log level.
   * @param message - The message to be logged.
   */
  log: (level: LogLevel, message: string) => void;
};
