import type { BaseError } from "@arcscord/better-error";
import type { DebugValues, DebugValueString } from "#/utils/error/error.type";
import type { LogFunc, LoggerInterface, LoggerOptions, LogLevel } from "#/utils/logger/logger.type";
import * as process from "node:process";
import { stringifyDebugValues } from "#/utils";
import { createErrorReport, renderErrorReport, renderJsonErrorReport } from "#/utils/logger/logger.report";
import { colorDebugValue, formatJsonLog, formatLog, formatShortDebug, resolveLogFormat, resolveLogLevel, shouldLog, shouldUseJsonLogs } from "#/utils/logger/logger.util";

export class ArcLogger implements LoggerInterface {
  /**
   * The name of the logger
   */
  processName: string;

  /**
   * Logger function
   * @default console.log
   */
  loggerFunction: LogFunc;

  /**
   * Minimum level to emit.
   */
  logLevel: LogLevel;

  /**
   * Output format.
   */
  logFormat: Required<LoggerOptions>["format"];

  /**
   * Optional secondary sink for detailed diagnostics.
   */
  diagnosticLoggerFunction?: LogFunc;

  /**
   * Diagnostic output format.
   */
  diagnosticFormat: Required<LoggerOptions>["format"];

  /**
   * Constructs an instance of the class with the specified process name and logger function.
   *
   * @param name - The name of the process.
   * @param loggerFunction - The logging function to use. Default console.log
   * @return A new instance of the class.
   */
  // eslint-disable-next-line no-console
  constructor(name: string, loggerFunction: LogFunc = console.log, options: LoggerOptions = {}) {
    this.processName = name;
    this.loggerFunction = loggerFunction;
    this.logLevel = resolveLogLevel(options.level || process.env.ARCSCORD_LOG_LEVEL || process.env.LOG_LEVEL);
    this.logFormat = resolveLogFormat(options.format || process.env.ARCSCORD_LOG_FORMAT || process.env.LOG_FORMAT);
    this.diagnosticLoggerFunction = options.diagnostics?.enabled
      ? options.diagnostics.loggerFunc
      : undefined;
    this.diagnosticFormat = resolveLogFormat(options.diagnostics?.format || "json");
  }

  /**
   * Logs a trace message.
   * @param message - The message to log.
   */
  trace(message: string): void {
    this.log("trace", message);
  }

  /**
   * Logs a debug message.
   * @param message - The message to log.
   */
  debug(message: string | DebugValueString): void {
    if (typeof message === "string") {
      this.log("debug", message);
    }
    else {
      this.log("debug", colorDebugValue(message));
    }
  }

  /**
   * Logs an informational message.
   * @param message - The message to log.
   */
  info(message: string): void {
    this.log("info", message);
  }

  /**
   * Logs a warning message.
   * @param message - The message to log.
   */
  warning(message: string): void {
    this.log("warning", message);
  }

  /**
   * Logs an error message with optional debug information.
   * @param message - The error message to log.
   * @param debugs - Optional debug information to log.
   */
  error(message: string, debugs: (string | DebugValueString)[] | DebugValues = []): void {
    this.log("error", message);

    if (!Array.isArray(debugs)) {
      debugs = stringifyDebugValues(debugs);
    }

    for (const debug of debugs) {
      this.loggerFunction(formatShortDebug(debug));
    }
  }

  /**
   * Logs a BaseError instance.
   * @param error - The error to log.
   */
  logError(error: BaseError | unknown | unknown[] | Error): void {
    if (!shouldLog("error", this.logLevel)) {
      return;
    }

    const report = createErrorReport(error);
    this.loggerFunction(
      shouldUseJsonLogs(this.logFormat)
        ? renderJsonErrorReport(report, this.processName)
        : renderErrorReport(report, this.processName),
    );
    this.writeDiagnosticReport(report);
  }

  /**
   * Logs a fatal error message with optional debug information and exits the process.
   * @param message - The fatal error message to log.
   * @param debugs - Optional debug information to log.
   */
  fatal(message: string, debugs: (string | DebugValueString)[] | DebugValues = []): never {
    this.log("fatal", message);

    if (!Array.isArray(debugs)) {
      debugs = stringifyDebugValues(debugs);
    }

    for (const debug of debugs) {
      this.loggerFunction(formatShortDebug(debug));
    }
    return process.exit(1);
  }

  /**
   * Logs a BaseError instance as a fatal error and exits the process.
   * @param error - The error to log.
   */
  fatalError(error: BaseError): never {
    const report = createErrorReport(error, "fatal");
    this.loggerFunction(
      shouldUseJsonLogs(this.logFormat)
        ? renderJsonErrorReport(report, this.processName)
        : renderErrorReport(report, this.processName),
    );
    this.writeDiagnosticReport(report);
    return process.exit(1);
  }

  /**
   * Logs a message at the specified log level.
   * @param level - The log level.
   * @param message - The message to log.
   */
  log(level: LogLevel, message: string): void {
    if (!shouldLog(level, this.logLevel)) {
      return;
    }

    this.loggerFunction(
      shouldUseJsonLogs(this.logFormat)
        ? formatJsonLog(level, message, this.processName)
        : formatLog(level, message, this.processName),
    );
  }

  private writeDiagnosticReport(report: ReturnType<typeof createErrorReport>): void {
    if (!this.diagnosticLoggerFunction) {
      return;
    }

    this.diagnosticLoggerFunction(
      shouldUseJsonLogs(this.diagnosticFormat)
        ? renderJsonErrorReport(report, this.processName)
        : renderErrorReport(report, this.processName),
    );
  }
}

/**
 * A default logger instance for easy use.
 * Always an ArcLogger with console.log.
 */
export const defaultLogger = new ArcLogger("main");
