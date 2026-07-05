import type { DebugValues, LoggerInterface } from "arcscord";
import type { Logger } from "pino";
import pino from "pino";

// same adapter documented in website/docs/guide/logger.md
function adaptPino(instance: Logger): LoggerInterface {
  return {
    trace: (message, meta) => instance.trace(meta ?? {}, message),
    debug: (message, meta) => instance.debug(meta ?? {}, typeof message === "string" ? message : message.join(" : ")),
    info: (message, meta) => instance.info(meta ?? {}, message),
    warn: (message, meta) => instance.warn(meta ?? {}, message),
    error: (message, meta) => instance.error(meta ?? {}, message),
    logError: (error, meta) => instance.error({ err: error, ...meta }, "an error occurred"),
    fatal: (message, meta) => instance.fatal(meta ?? {}, message),
    fatalError: (error, meta) => instance.fatal({ err: error, ...meta }, "a fatal error occurred"),
    log: (level, message, meta: DebugValues = {}) => instance[level](meta, message),
    child: bindings => adaptPino(instance.child(bindings)),
  };
}

export function run(): void {
  console.log("--- pino adapter (real pino instance, JSON output) ---");
  // pino writes asynchronously by default (it can reorder relative to synchronous
  // console.log calls elsewhere in this demo) — force a sync destination so section
  // output stays in order. Long-running servers should keep the async default.
  const logger = adaptPino(pino(pino.destination({ sync: true })));

  logger.info("server started", { shard: 0 });
  logger.warn("cache miss");
  logger.error("failed to reach the database");
  logger.logError(new Error("boom"));

  const scoped = logger.child?.({ requestId: "req_1" }) ?? logger;
  scoped.info("handled request");
}
