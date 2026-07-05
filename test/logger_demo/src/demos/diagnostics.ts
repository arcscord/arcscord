import { ArcLogger } from "arcscord";

export function run(): void {
  console.log("--- no diagnostics sink: main sink keeps the full stack (default errorDetail=\"full\") ---");
  const noSink = new ArcLogger("demo");
  noSink.logError(new Error("boom"));

  console.log("\n--- diagnostics sink configured: main sink shortens automatically (errorDetail=\"short\") ---");
  const withSink = new ArcLogger("demo", undefined, {
    diagnostics: {
      format: "json",
      loggerFunc: line => console.log(`[diagnostics] ${String(line)}`),
    },
  });
  withSink.logError(new Error("boom"));

  console.log("\n--- errorDetail overrides the automatic default, independent of the sink ---");
  const forcedFull = new ArcLogger("demo", undefined, {
    errorDetail: "full",
    diagnostics: {
      loggerFunc: line => console.log(`[diagnostics] ${String(line)}`),
    },
  });
  forcedFull.logError(new Error("boom, but kept full on the main sink too"));

  const forcedShort = new ArcLogger("demo", undefined, { errorDetail: "short" });
  forcedShort.logError(new Error("boom, but shortened with no sink at all"));
}
