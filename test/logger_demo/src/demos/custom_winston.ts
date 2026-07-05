import type { LoggerInterface } from "arcscord";
import winston from "winston";

// winston's default JSON format serializes a raw Error as "{}" (message/stack are
// non-enumerable) unless winston.format.errors() is in the chain — serialize explicitly
// instead so the adapter works with any format the caller configures.
function serializeError(error: unknown): unknown {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;
}

// same adapter documented in website/docs/guide/logger.md
function adaptWinston(instance: winston.Logger): LoggerInterface {
  return {
    trace: (message, meta) => instance.debug(message, meta),
    debug: (message, meta) => instance.debug(typeof message === "string" ? message : message.join(" : "), meta),
    info: (message, meta) => instance.info(message, meta),
    warn: (message, meta) => instance.warn(message, meta),
    error: (message, meta) => instance.error(message, meta),
    logError: (error, meta) => instance.error("an error occurred", { err: serializeError(error), ...meta }),
    fatal: (message, meta) => instance.error(message, meta),
    fatalError: (error, meta) => instance.error("a fatal error occurred", { err: serializeError(error), ...meta }),
    log: (level, message, meta) => {
      instance.log(level === "warn" ? "warn" : level === "fatal" || level === "trace" ? "debug" : level, message, meta);
    },
    child: bindings => adaptWinston(instance.child(bindings)),
  };
}

export function run(): void {
  console.log("--- winston adapter (real winston instance, JSON output) ---");
  const logger = adaptWinston(winston.createLogger({
    level: "debug",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  }));

  logger.info("server started");
  logger.warn("cache miss");
  logger.error("failed to reach the database");
  logger.logError(new Error("boom"));

  const scoped = logger.child?.({ requestId: "req_1" }) ?? logger;
  scoped.info("handled request");
}
