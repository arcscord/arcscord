import { ArcLogger } from "arcscord";

export function run(): void {
  console.log("--- child() binds fields for the rest of a request ---");
  const logger = new ArcLogger("demo", undefined, { format: "json" });

  // child() is optional on LoggerInterface, so callers fall back to the parent logger:
  // logger.child?.(bindings) ?? logger
  const requestLogger = logger.child?.({ interactionId: "abc123", guildId: "42" }) ?? logger;
  requestLogger.debug("started");
  requestLogger.info("done", { durationMs: 8 }); // meta merges with the bound fields

  console.log("\n--- nested child() accumulates bindings ---");
  const commandLogger = requestLogger.child?.({ command: "ping" }) ?? requestLogger;
  commandLogger.info("command executed");

  console.log("\n--- call-site meta overrides a bound field with the same key ---");
  const userLogger = logger.child?.({ userId: "1" }) ?? logger;
  userLogger.info("acting as another user for this call", { userId: "2" });
}
