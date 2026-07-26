import type { ArcscordError } from "#/utils/error/arcscord_error";
import type { DebugValues } from "#/utils/error/error.type";
import type { LogLevel } from "#/utils/logger/logger.type";
import { isArcscordError } from "#/utils/error/arcscord_error";
import { formatLog, formatShortDebug } from "#/utils/logger/logger.util";

const MAX_DEPTH = 3;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 30;
const MAX_STRING_LENGTH = 800;
const SENSITIVE_KEY_PATTERN = /token|authorization|password|secret|cookie|api[_-]?key|private[_-]?key|credential/i;

/**
 * Redacts common secret representations embedded in free-form log text.
 *
 * Key-based object redaction remains the strongest protection. This textual
 * pass covers the forms most often found in error messages and stack traces:
 * assignments, authorization schemes, credentials in URLs, Discord webhook
 * URLs, and Discord token shapes.
 *
 * @internal
 */
export function sanitizeLogText(value: string): string {
  return value
    .replace(
      /((?:^|["'\s{,])["']?(?:authorization|cookie)["']?\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,}][^\r\n,}]*)/gim,
      "$1[redacted]",
    )
    .replace(
      /((?:^|["'\s{,])["']?(?:token|password|secret|api[_-]?key|private[_-]?key|credential)["']?\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;}\]]+)/gim,
      "$1[redacted]",
    )
    .replace(/\b(Bearer|Bot|Basic)\s+[\w.~+/-]+={0,2}/gi, "$1 [redacted]")
    .replace(
      /(https?:\/\/)[^/\s:@]+:[^@\s/]+@/gi,
      "$1[redacted]@",
    )
    .replace(
      /(https?:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/)[^/?#\s]+/gi,
      "$1[redacted]",
    )
    .replace(/\bmfa\.[\w-]{20,}\b/g, "mfa.[redacted]")
    .replace(
      /\b[\w-]{20,}\.[\w-]{6}\.[\w-]{20,}\b/g,
      "[redacted-discord-token]",
    );
}

/**
 * Plain, JSON-safe representation of an error and its `cause` chain, produced
 * while building an {@link ErrorReport}.
 */
export type SerializedError = {
  type: string;
  code?: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
};

/**
 * Sanitized, structured description of an error ready to be rendered or shipped
 * to an external sink. Secrets are redacted and large values truncated during
 * creation — see {@link createErrorReport}.
 */
export type ErrorReport = {
  level: Extract<LogLevel, "error" | "fatal">;
  message: string;
  error: SerializedError;
  debug: DebugValues;
};

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
    return truncateString(sanitizeLogText(value));
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
      message: sanitizeLogText(value.message),
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
      .map(([key, item]) => {
        return [
          sanitizeValue(key, depth + 1, seen),
          typeof key === "string" && SENSITIVE_KEY_PATTERN.test(key)
            ? "[redacted]"
            : sanitizeValue(item, depth + 1, seen),
        ];
      });
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
    if (SENSITIVE_KEY_PATTERN.test(key)) {
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

/**
 * Returns a sanitized copy of structured logger metadata.
 *
 * @internal
 */
export function sanitizeDebugValues(value: DebugValues): DebugValues {
  return sanitizeValue(value) as DebugValues;
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

function serializeError(error: unknown, seen = new WeakSet<object>()): SerializedError {
  if (error instanceof Error) {
    if (seen.has(error)) {
      return {
        type: error.name,
        message: "[Circular error cause]",
      };
    }
    seen.add(error);

    const cause = error.cause ? serializeError(error.cause, seen) : undefined;

    return {
      type: error.name,
      code: isArcscordError(error) ? error.code : undefined,
      message: sanitizeLogText(error.message),
      stack: error.stack ? sanitizeLogText(error.stack) : undefined,
      cause,
    };
  }

  return {
    type: "NonError",
    message: stringifyValue(error),
  };
}

function serializeDebugs(error: unknown): DebugValues {
  if (!isArcscordError(error)) {
    return {};
  }
  return sanitizeDebugValues(error.metadata);
}

/**
 * Builds a sanitized {@link ErrorReport} from any thrown value.
 *
 * Redacts secret-looking keys and recognizable credentials embedded in messages,
 * stack traces, and cause chains; truncates oversized strings/collections; and
 * unwraps {@link ArcscordError} metadata and native causes. Reuse it in a custom
 * `logError` implementation instead of re-implementing sanitization.
 *
 * @param error - The thrown value; if an array is given, its first element is used.
 * @param level - The severity to record on the report. Defaults to `"error"`.
 */
export function createErrorReport(
  error: unknown | unknown[],
  level: Extract<LogLevel, "error" | "fatal"> = "error",
): ErrorReport {
  const firstError = Array.isArray(error) ? error[0] : error;
  const arcscordError: ArcscordError | undefined = isArcscordError(firstError) ? firstError : undefined;
  const serialized = serializeError(firstError);

  return {
    level,
    message: arcscordError
      ? `${arcscordError.name} [${arcscordError.code}]: ${serialized.message}`
      : `${serialized.type}: ${serialized.message}`,
    error: serialized,
    debug: serializeDebugs(firstError),
  };
}

/**
 * Options controlling how an {@link ErrorReport} is rendered by
 * {@link renderErrorReport} / {@link renderJsonErrorReport}.
 */
export type ErrorReportRenderOptions = {
  /**
   * Whether to include the stack trace and the full cause chain.
   * @default true
   */
  includeStack?: boolean;
};

/**
 * Renders an {@link ErrorReport} to a colored, human-readable multi-line string
 * (matching {@link ArcLogger}'s pretty output), including debug fields and,
 * unless disabled, the stack trace and cause chain.
 *
 * @param report - The report to render.
 * @param processName - The process/logger name shown in the header.
 * @param options - Rendering options; see {@link ErrorReportRenderOptions}.
 */
export function renderErrorReport(
  report: ErrorReport,
  processName: string,
  options: ErrorReportRenderOptions = {},
): string {
  const { includeStack = true } = options;

  const lines = [
    formatLog(report.level, report.message, processName),
  ];

  lines.push(formatShortDebug(["errorType", report.error.type]));

  for (const [key, value] of Object.entries(report.debug)) {
    lines.push(formatShortDebug([key, stringifyValue(value)]));
  }

  if (!includeStack) {
    return lines.join("\n");
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

/**
 * Renders an {@link ErrorReport} as a single structured JSON line suitable for
 * machine ingestion. When `includeStack` is `false`, the stack and cause chain
 * are omitted and only the error `type`/`message` are kept.
 *
 * @param report - The report to render.
 * @param processName - The process/logger name recorded in the payload.
 * @param options - Rendering options; see {@link ErrorReportRenderOptions}.
 */
export function renderJsonErrorReport(
  report: ErrorReport,
  processName: string,
  options: ErrorReportRenderOptions = {},
): string {
  const { includeStack = true } = options;

  return JSON.stringify({
    time: new Date().toISOString(),
    level: report.level,
    process: processName,
    message: report.message,
    error: includeStack
      ? report.error
      : { type: report.error.type, message: report.error.message },
    debug: report.debug,
  });
}
