import { ArcLogger, ArcscordError } from "arcscord";

export function run(): void {
  console.log("--- fatal()/fatalError() only log, they never exit or throw on their own ---");
  const logger = new ArcLogger("demo");

  logger.fatal("out of memory, this should be unrecoverable");
  console.log("(this line still runs: fatal() did not stop execution)");

  logger.fatalError(new ArcscordError({
    code: "APPLICATION_UNAVAILABLE",
    message: "disk full",
    metadata: { operation: "logger-demo" },
  }));
  console.log("(this line still runs too: fatalError() did not stop execution either)");

  console.log("\n--- callers that need to stop must throw or exit right after, e.g.: ---");
  try {
    const err = new ArcscordError({
      code: "APPLICATION_UNAVAILABLE",
      message: "could not load required config",
      metadata: { operation: "logger-demo" },
    });
    logger.fatalError(err);
    throw err; // the caller decides to halt, fatalError() itself never does
  }
  catch (err) {
    console.log(`(caught: "${(err as Error).message}" — the process is still alive)`);
  }
}
