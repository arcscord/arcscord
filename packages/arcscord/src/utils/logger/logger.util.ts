import type { DebugValues, DebugValueString } from "#/utils/error/error.type";
import type { LogFunc, LoggerConstructor, LoggerInterface, LoggerOptions, LogLevel } from "#/utils/logger/logger.type";
import * as process from "node:process";
import { effectReset } from "tintify";
import {
  DATE_COLOR,
  DEBUG_KEY_COLOR,
  DEBUG_VALUE_COLOR,
  logLevelInfos,
  MAX_PROCESS_LENGTH,
  MAX_TITLE_LENGTH,
  PROCESS_NAME_COLOR,
  SEPARATOR_COLOR,
  SHORT_DEBUG_PREFIX,
  SHORT_DEBUG_SPACING,
  SPACE_FILLER,
} from "#/utils/logger/logger.const";

function formatLocalDate(date: Date): string {
  const pad = (value: number): string => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function resolveLogLevel(level?: string): LogLevel {
  if (level === "warning") {
    return "warn";
  }

  if (level && level in logLevelInfos) {
    return level as LogLevel;
  }

  return "info";
}

/**
 * Resolves the default output function for a level when no custom `loggerFunc` is provided.
 * Routes `warn`/`error`/`fatal` to `console.error` and everything else to `console.log`,
 * matching the Unix/Node stdout-stderr convention.
 */
export function resolveDefaultLogFunc(level: LogLevel): LogFunc {
  // eslint-disable-next-line no-console
  return level === "warn" || level === "error" || level === "fatal" ? console.error : console.log;
}

export function resolveLogFormat(format?: string): Required<LoggerOptions>["format"] {
  return format === "json" ? "json" : "pretty";
}

export function shouldUseJsonLogs(format?: LoggerOptions["format"]): boolean {
  return resolveLogFormat(format || process.env.ARCSCORD_LOG_FORMAT || process.env.LOG_FORMAT) === "json";
}

export function formatJsonLog(
  logLevel: LogLevel,
  message: string,
  processName = "main",
  meta?: DebugValues,
): string {
  return JSON.stringify({
    time: new Date().toISOString(),
    level: logLevel,
    process: processName,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  });
}

export function shouldLog(
  level: LogLevel,
  configuredLevel: LogLevel = resolveLogLevel(process.env.ARCSCORD_LOG_LEVEL || process.env.LOG_LEVEL),
): boolean {
  return logLevelInfos[level].logPriority <= logLevelInfos[configuredLevel].logPriority;
}

export function formatLog(
  logLevel: LogLevel,
  message: string,
  processName = "main",
): string {
  const reset = effectReset.all;
  const options = logLevelInfos[logLevel];

  const date = formatLocalDate(new Date());

  if (processName.length > MAX_PROCESS_LENGTH) {
    processName = processName.slice(0, MAX_PROCESS_LENGTH);
  }
  else if (processName.length < MAX_PROCESS_LENGTH) {
    processName = processName.padEnd(MAX_PROCESS_LENGTH, SPACE_FILLER);
  }

  const prefix = `${reset}${DATE_COLOR}[${date}] ${reset}${PROCESS_NAME_COLOR}${processName}`;
  const middle = `${reset} ${SEPARATOR_COLOR}[${options.titleColor}${options.logText}${reset}${SEPARATOR_COLOR}]`;
  const separator = `${reset} ${SEPARATOR_COLOR}${"-".repeat(MAX_TITLE_LENGTH - options.logText.length)} » `;
  const text = `${reset}${options.textColor}${message}`;

  return prefix + middle + separator + text;
}

export function colorDebugValue([key, value]: DebugValueString): string {
  const reset = effectReset.all;
  return `${reset}${DEBUG_KEY_COLOR}${key} : ${reset}${DEBUG_VALUE_COLOR}${value}`;
}

export function formatShortDebug(message: string | DebugValueString): string {
  if (typeof message !== "string") {
    message = colorDebugValue(message);
  }

  const options = logLevelInfos.debug;
  const reset = effectReset.all;

  const prefix = `${reset}${SEPARATOR_COLOR}${" ".repeat(SHORT_DEBUG_SPACING)}${SHORT_DEBUG_PREFIX}`;
  const middle = `[${reset}${options.titleColor}${options.logText}${reset}${SEPARATOR_COLOR}]`;
  const separator = `${reset} ${SEPARATOR_COLOR}${"-".repeat(MAX_TITLE_LENGTH - options.logText.length)} » `;
  const text = `${reset}${options.textColor}${message}`;

  return prefix + middle + separator + text;
}

/**
 * Creates a new logger instance using the provided constructor function.
 *
 * @param constructorFunc - The constructor function to create the logger instance.
 * @param name - The name to be assigned to the logger.
 * @param logFunc - Optional custom logging function. If omitted, the logger picks its own
 * per-level default (`console.error` for warn/error/fatal, `console.log` otherwise).
 * @return - The created logger instance.
 */
export function createLogger(
  constructorFunc: LoggerConstructor,
  name: string,
  logFunc?: LogFunc,
  options?: LoggerOptions,
): LoggerInterface {
  // eslint-disable-next-line new-cap
  return new constructorFunc(name, logFunc, options);
}
