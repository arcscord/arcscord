import type { BaseError } from "@arcscord/better-error";
import type { DebugValues } from "#/utils/error/error.type";
import type { LogLevel } from "#/utils/logger/logger.type";
import { formatLog, formatShortDebug } from "#/utils/logger/logger.util";

const MAX_DEPTH = 3;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 30;
const MAX_STRING_LENGTH = 800;

export type SerializedError = {
  type: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
};

export type ErrorReport = {
  id?: string;
  level: Extract<LogLevel, "error" | "fatal">;
  message: string;
  error: SerializedError;
  debug: DebugValues;
};

function isBaseError(error: unknown): error is BaseError {
  return error instanceof Error
    && "fullMessage" in error
    && typeof error.fullMessage === "function"
    && "getDebugsObject" in error
    && typeof error.getDebugsObject === "function";
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}... [truncated ${value.length - MAX_STRING_LENGTH} chars]`;
}

function sanitizeValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (
    value === null
    || typeof value === "number"
    || typeof value === "boolean"
    || typeof value === "bigint"
    || typeof value === "undefined"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (value instanceof Error) {
    return {
      type: value.name,
      message: value.message,
    };
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (depth >= MAX_DEPTH) {
    return `[${value.constructor?.name || "Object"}]`;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map(item => sanitizeValue(item, depth + 1, seen));
  }

  if (value instanceof Map) {
    return Array.from(value.entries())
      .slice(0, MAX_ARRAY_ITEMS)
      .map(([key, item]) => [
        sanitizeValue(key, depth + 1, seen),
        sanitizeValue(item, depth + 1, seen),
      ]);
  }

  if (value instanceof Set) {
    return Array.from(value.values())
      .slice(0, MAX_ARRAY_ITEMS)
      .map(item => sanitizeValue(item, depth + 1, seen));
  }

  if (Symbol.iterator in value && value.constructor?.name !== "Object") {
    return Array.from(value as Iterable<unknown>)
      .slice(0, MAX_ARRAY_ITEMS)
      .map(item => sanitizeValue(item, depth + 1, seen));
  }

  const output: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);

  for (const [key, item] of entries) {
    if (/token|authorization|password|secret|cookie/i.test(key)) {
      output[key] = "[redacted]";
      continue;
    }

    output[key] = sanitizeValue(item, depth + 1, seen);
  }

  const totalKeys = Object.keys(value).length;
  if (totalKeys > MAX_OBJECT_KEYS) {
    output.__truncatedKeys = totalKeys - MAX_OBJECT_KEYS;
  }

  return output;
}

function stringifyValue(value: unknown): string {
  const sanitized = sanitizeValue(value);

  if (typeof sanitized === "string") {
    return sanitized;
  }

  try {
    return JSON.stringify(sanitized);
  }
  catch {
    return String(sanitized);
  }
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const cause = error instanceof Error && error.cause
      ? serializeError(error.cause)
      : isBaseError(error) && error.originalError
        ? serializeError(error.originalError)
        : undefined;

    return {
      type: error.name,
      message: error.message,
      stack: error.stack,
      cause,
    };
  }

  return {
    type: "NonError",
    message: stringifyValue(error),
  };
}

function serializeDebugs(error: unknown): DebugValues {
  if (!isBaseError(error)) {
    return {};
  }

  const debugs = error.getDebugsObject({
    id: false,
    originalErrorDebugs: false,
    originalErrorStack: false,
    stack: false,
  });

  return sanitizeValue(debugs) as DebugValues;
}

export function createErrorReport(
  error: BaseError | Error | unknown | unknown[],
  level: Extract<LogLevel, "error" | "fatal"> = "error",
): ErrorReport {
  const firstError = Array.isArray(error) ? error[0] : error;
  const baseError = isBaseError(firstError) ? firstError : undefined;
  const serialized = serializeError(firstError);

  return {
    id: baseError?.id,
    level,
    message: baseError?.fullMessage() ?? `${serialized.type}: ${serialized.message}`,
    error: serialized,
    debug: serializeDebugs(firstError),
  };
}

export function renderErrorReport(
  report: ErrorReport,
  processName: string,
): string {
  const lines = [
    formatLog(report.level, report.message, processName),
  ];

  if (report.id) {
    lines.push(formatShortDebug(["errorId", report.id]));
  }

  lines.push(formatShortDebug(["errorType", report.error.type]));

  for (const [key, value] of Object.entries(report.debug)) {
    lines.push(formatShortDebug([key, stringifyValue(value)]));
  }

  if (report.error.stack) {
    lines.push("");
    lines.push(report.error.stack);
  }

  let cause = report.error.cause;
  while (cause) {
    lines.push("");
    lines.push(`Caused by: ${cause.type}: ${cause.message}`);
    if (cause.stack) {
      lines.push(cause.stack);
    }
    cause = cause.cause;
  }

  return lines.join("\n");
}

export function renderJsonErrorReport(
  report: ErrorReport,
  processName: string,
): string {
  return JSON.stringify({
    time: new Date().toISOString(),
    level: report.level,
    process: processName,
    errorId: report.id,
    message: report.message,
    error: report.error,
    debug: report.debug,
  });
}
