import { spawn } from "node:child_process";
import process from "node:process";
import { readHostEnv, readPortEnv } from "../utils/env";

const webhookPath = "/discord/webhooks";
const host = readHostEnv("WEBHOOK_HOST", "127.0.0.1");
const port = readPortEnv("WEBHOOK_PORT", 3000);
const urlHost = host.includes(":") ? `[${host}]` : host;
const origin = `http://${urlHost}:${port}`;
const quickTunnelUrl = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
const debug = process.env.WEBHOOK_TUNNEL_DEBUG === "1";

process.stdout.write(`Starting a Cloudflare Quick Tunnel to ${origin}...\nPlease wait...\n`);

const tunnel = spawn("cloudflared", [
  "tunnel",
  "--no-autoupdate",
  "--no-prechecks",
  "--url",
  origin,
], {
  stdio: ["inherit", "pipe", "pipe"],
});
let detectedOutput = "";
let endpointPrinted = false;
let spawnFailed = false;
let stopping = false;

function inspectOutput(chunk: Buffer, output: NodeJS.WriteStream): void {
  if (debug) {
    output.write(chunk);
  }
  if (endpointPrinted) {
    return;
  }

  detectedOutput = `${detectedOutput}${chunk.toString("utf8")}`.slice(-8_192);
  const match = detectedOutput.match(quickTunnelUrl);
  if (!match) {
    return;
  }

  endpointPrinted = true;
  const endpoint = `${match[0]}${webhookPath}`;
  process.stdout.write([
    "",
    "✓ Cloudflare Quick Tunnel is ready.",
    "",
    "Copy this complete URL into Discord Developer Portal > Webhooks > Endpoint URL:",
    "",
    `  ${endpoint}`,
    "",
    "Development only — do not use this Quick Tunnel in production.",
    "Keep this terminal open while testing. The URL changes when the Quick Tunnel restarts.",
    "",
  ].join("\n"));
}

tunnel.stdout.on("data", chunk => inspectOutput(chunk, process.stdout));
tunnel.stderr.on("data", chunk => inspectOutput(chunk, process.stderr));

tunnel.once("error", (error: NodeJS.ErrnoException) => {
  spawnFailed = true;
  if (error.code === "ENOENT") {
    process.stderr.write([
      "\ncloudflared was not found.",
      "Install it from https://developers.cloudflare.com/tunnel/downloads/",
      "Then run `pnpm tunnel` again.",
      "",
    ].join("\n"));
  }
  else {
    process.stderr.write(`Unable to start cloudflared: ${error.message}\n`);
  }
  process.exitCode = 1;
});

tunnel.once("close", (code) => {
  if (!spawnFailed && !stopping && code !== 0) {
    const diagnostics = detectedOutput
      .split(/\r?\n/)
      .filter(line => /\b(?:ERR|WRN)\b/.test(line))
      .slice(-8);
    process.stderr.write([
      `cloudflared stopped with exit code ${code ?? "unknown"}.`,
      ...(diagnostics.length > 0
        ? ["Cloudflare diagnostics:", ...diagnostics]
        : ["Run with WEBHOOK_TUNNEL_DEBUG=1 to show cloudflared logs."]),
      "",
    ].join("\n"));
    process.exitCode = code ?? 1;
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    stopping = true;
    process.stdout.write("\nStopping Cloudflare Quick Tunnel...\n");
    tunnel.kill(signal);
  });
}
