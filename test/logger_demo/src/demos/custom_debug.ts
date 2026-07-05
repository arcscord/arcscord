import type { LoggerInterface } from "arcscord";
import createDebug from "debug";

// same adapter documented in website/docs/guide/logger.md
function adaptDebug(namespace: string): LoggerInterface {
  const log = createDebug(namespace);

  return {
    trace: (message, meta) => log(message, meta ?? ""),
    debug: (message, meta) => log(typeof message === "string" ? message : message.join(" : "), meta ?? ""),
    info: (message, meta) => log(message, meta ?? ""),
    warn: (message, meta) => console.warn(message, meta ?? ""),
    error: (message, meta) => console.error(message, meta ?? ""),
    logError: error => console.error(error),
    fatal: (message, meta) => console.error(message, meta ?? ""),
    fatalError: error => console.error(error),
    log: (level, message, meta) => (level === "warn" || level === "error" || level === "fatal" ? console.error : log)(message, meta ?? ""),
  };
}

export function run(): void {
  console.log("--- debug package adapter (namespace-gated by DEBUG env var) ---");
  console.log("run with DEBUG=arcscord:* to see trace/debug lines");
  const logger = adaptDebug("arcscord:demo");

  logger.trace("verbose trace line, only visible with DEBUG=arcscord:*");
  logger.debug("debug line, only visible with DEBUG=arcscord:*");
  logger.info("info line, also gated by DEBUG");
  logger.warn("this always prints via console.warn");
  logger.error("this always prints via console.error");
}
