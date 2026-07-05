import { ArcLogger } from "arcscord";

export function run(): void {
  console.log("--- structured meta, pretty format (extra lines) ---");
  const pretty = new ArcLogger("demo");
  pretty.info("command executed", {
    command: "ping",
    interactionId: "1234567890",
    guildId: "42",
    durationMs: 12,
  });

  console.log("\n--- structured meta, json format (merged under \"meta\") ---");
  const json = new ArcLogger("demo", undefined, { format: "json" });
  json.info("command executed", {
    command: "ping",
    interactionId: "1234567890",
    guildId: "42",
    durationMs: 12,
  });

  console.log("\n--- meta on logError, merged alongside the error's own debug values ---");
  json.logError(new Error("something broke"), { interactionId: "1234567890" });
}
