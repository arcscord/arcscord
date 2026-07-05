import { ArcLogger } from "arcscord";

export function run(): void {
  console.log("--- default logger (pretty, level=info) ---");
  const pretty = new ArcLogger("demo");
  pretty.trace("trace is below the default level, this line should not appear");
  pretty.debug("debug is below the default level, this line should not appear");
  pretty.info("server started");
  pretty.warn("cache miss, falling back to database");
  pretty.error("failed to reach the database");

  console.log("\n--- level filtering (level=\"warn\") ---");
  const filtered = new ArcLogger("demo", undefined, { level: "warn" });
  filtered.info("this is filtered out");
  filtered.warn("this gets through");
  filtered.error("this gets through too");

  console.log("\n--- json format ---");
  const json = new ArcLogger("demo", undefined, { format: "json" });
  json.info("server started");
  json.warn("cache miss, falling back to database");

  console.log("\n--- default output routing (warn/error/fatal -> stderr, rest -> stdout) ---");
  console.log("run with: pnpm start 1>stdout.log 2>stderr.log, then diff the two files");
  const routed = new ArcLogger("demo");
  routed.info("this line goes to stdout");
  routed.warn("this line goes to stderr");
  routed.error("this line goes to stderr too");
}
