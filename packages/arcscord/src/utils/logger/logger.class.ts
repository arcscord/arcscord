import type { BaseError } from "@arcscord/better-error";
import type { DebugValues, DebugValueString } from "#/utils/error/error.type";
import type { LogFunc, LoggerInterface, LoggerOptions, LogLevel } from "#/utils/logger/logger.type";
import * as process from "node:process";
import { stringifyDebugValues } from "#/utils";
import { createErrorReport, renderErrorReport, renderJsonErrorReport } from "#/utils/logger/logger.report";
import { colorDebugValue, formatJsonLog, formatLog, formatShortDebug, resolveDefaultLogFunc, resolveLogFormat, resolveLogLevel, shouldLog, shouldUseJsonLogs } from "#/utils/logger/logger.util";

export class ArcLogger implements LoggerInterface {
  /**
   * The name of the logger
   */
  processName: string;

  /**
   * Logger function.
   * When undefined, output is routed per-level to `console.error` (warn/error/fatal) or
   * `console.log` (everything else).
   * @default undefined
   */
  loggerFunction: LogFunc | undefined;

  /**
   * Minimum level to emit.
   */
  logLevel: LogLevel;

  /**
   * Output format.
   */
  logFormat: Required<LoggerOptions>["format"];

  /**
   * Optional secondary sink for detailed diagnostics. Set whenever `options.diagnostics` is provided.
   */
  diagnosticLoggerFunction?: LogFunc;

  /**
   * Diagnostic output format.
   */
  diagnosticFormat: Required<LoggerOptions>["format"];

  /**
   * How much detail `logError`/`fatalError` print on the main sink.
   */
  errorDetail: Required<LoggerOptions>["errorDetail"];

  /**
   * Constructs an instance of the class with the specified process name and logger function.
   *
   * @param name - The name of the process.
   * @param loggerFunction - The logging function to use. If omitted, output is routed per-level
   * between `console.log` and `console.error`.
   * @return A new instance of the class.
   */
  constructor(name: string, loggerFunction?: LogFunc, options: LoggerOptions = {}) {
    this.processName = name;
    this.loggerFunction = loggerFunction;
    this.logLevel = resolveLogLevel(options.level || process.env.ARCSCORD_LOG_LEVEL || process.env.LOG_LEVEL);
    this.logFormat = resolveLogFormat(options.format || process.env.ARCSCORD_LOG_FORMAT || process.env.LOG_FORMAT);
    this.diagnosticLoggerFunction = options.diagnostics?.loggerFunc;
    this.diagnosticFormat = resolveLogFormat(options.diagnostics?.format || "json");
    this.errorDetail = options.errorDetail ?? (this.diagnosticLoggerFunction ? "short" : "full");
  }

  /**
   * Logs a trace message.
   * @param message - The message to log.
   * @param meta - Optional structured fields to attach to the log line.
   */
  trace(message: string, meta?: DebugValues): void {
    this.log("trace", message, meta);
  }

  /**
   * Logs a debug message.
   * @param message - The message to log.
   * @param meta - Optional structured fields to attach to the log line.
   */
  debug(message: string | DebugValueString, meta?: DebugValues): void {
    if (typeof message === "string") {
      this.log("debug", message, meta);
    }
    else {
      this.log("debug", colorDebugValue(message), meta);
    }
  }

  /**
   * Logs an informational message.
   * @param message - The message to log.
   * @param meta - Optional structured fields to attach to the log line.
   */
  info(message: string, meta?: DebugValues): void {
    this.log("info", message, meta);
  }

  /**
   * Logs a warning message.
   * @param message - The message to log.
   * @param meta - Optional structured fields to attach to the log line.
   */
  warn(message: string, meta?: DebugValues): void {
    this.log("warn", message, meta);
  }

  /**
   * Logs an error message.
   * @param message - The error message to log.
   * @param meta - Optional structured fields to attach to the log line.
   */
  error(message: string, meta?: DebugValues): void {
    this.log("error", message, meta);
  }

  /**
   * Logs a BaseError instance.
   * @param error - The error to log.
   * @param meta - Optional extra structured fields to merge alongside the error's own debug values.
   */
  logError(error: BaseError | unknown | unknown[] | Error, meta?: DebugValues): void {
    if (!shouldLog("error", this.logLevel)) {
      return;
    }

    const report = createErrorReport(error);
    if (meta) {
      Object.assign(report.debug, meta);
    }

    const includeStack = this.errorDetail === "full";
    this.write(
      shouldUseJsonLogs(this.logFormat)
        ? renderJsonErrorReport(report, this.processName, { includeStack })
        : renderErrorReport(report, this.processName, { includeStack }),
      "error",
    );
    this.writeDiagnosticReport(report);
  }

  /**
   * Logs a fatal error message with optional structured fields
   * @param message - The fatal error message to log.
   * @param meta - Optional structured fields to attach to the log line.
   */
  fatal(message: string, meta?: DebugValues): void {
    this.log("fatal", message, meta);
  }

  /**
   * Logs a BaseError instance as a fatal error
   * @param error - The error to log.
   * @param meta - Optional extra structured fields to merge alongside the error's own debug values.
   */
  fatalError(error: BaseError, meta?: DebugValues): void {
    const report = createErrorReport(error, "fatal");
    if (meta) {
      Object.assign(report.debug, meta);
    }

    const includeStack = this.errorDetail === "full";
    this.write(
      shouldUseJsonLogs(this.logFormat)
        ? renderJsonErrorReport(report, this.processName, { includeStack })
        : renderErrorReport(report, this.processName, { includeStack }),
      "fatal",
    );
    this.writeDiagnosticReport(report);
  }

  /**
   * Logs a message at the specified log level.
   * @param level - The log level.
   * @param message - The message to log.
   * @param meta - Optional structured fields to attach to the log line.
   */
  log(level: LogLevel, message: string, meta?: DebugValues): void {
    if (!shouldLog(level, this.logLevel)) {
      return;
    }

    const hasMeta = meta !== undefined && Object.keys(meta).length > 0;
    const useJson = shouldUseJsonLogs(this.logFormat);

    this.write(
      useJson
        ? formatJsonLog(level, message, this.processName, meta)
        : formatLog(level, message, this.processName),
      level,
    );

    if (hasMeta && !useJson) {
      for (const debug of stringifyDebugValues(meta)) {
        this.write(formatShortDebug(debug), level);
      }
    }
  }

  /**
   * Returns a logger that automatically merges `bindings` into the `meta` of every subsequent call.
   * @param bindings - Fields to bind on the returned logger.
   */
  child(bindings: DebugValues): LoggerInterface {
    return {
      trace: (message, meta) => this.trace(message, { ...bindings, ...meta }),
      debug: (message, meta) => this.debug(message, { ...bindings, ...meta }),
      info: (message, meta) => this.info(message, { ...bindings, ...meta }),
      warn: (message, meta) => this.warn(message, { ...bindings, ...meta }),
      error: (message, meta) => this.error(message, { ...bindings, ...meta }),
      logError: (error, meta) => this.logError(error, { ...bindings, ...meta }),
      fatal: (message, meta) => this.fatal(message, { ...bindings, ...meta }),
      fatalError: (error, meta) => this.fatalError(error, { ...bindings, ...meta }),
      log: (level, message, meta) => this.log(level, message, { ...bindings, ...meta }),
      child: (childBindings: DebugValues) => this.child({ ...bindings, ...childBindings }),
    };
  }

  private write(line: string, level: LogLevel): void {
    const fn = this.loggerFunction ?? resolveDefaultLogFunc(level);
    fn(line);
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
 * Always an ArcLogger with the default per-level console routing.
 */
export const defaultLogger: ArcLogger = new ArcLogger("main");
