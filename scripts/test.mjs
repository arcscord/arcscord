import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vitest = path.join(root, "node_modules/vitest/vitest.mjs");
const targets = [
  ["arcscord", "packages/arcscord"],
  ["@arcscord/better-error", "packages/better_error"],
  ["@arcscord/error", "packages/error"],
  ["@arcscord/middleware", "packages/middleware"],
  ["scripts", "scripts/tests"],
];

function runTarget([name, directory]) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(process.execPath, [vitest, "run"], {
      cwd: path.join(root, directory),
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", data => chunks.push(data));
    child.stderr.on("data", data => chunks.push(data));
    child.on("error", reject);
    child.on("exit", (code) => {
      process.stdout.write(`\n--- ${name} ---\n`);
      for (const data of chunks)
        process.stdout.write(data);

      resolve({ code: code ?? 1, name });
    });
  });
}

process.stdout.write(`Running tests for ${targets.length} targets in parallel...\n`);

const results = await Promise.all(targets.map(runTarget));

process.stdout.write("\nTest summary:\n");
for (const { code, name } of results)
  process.stdout.write(`${code === 0 ? "PASS" : "FAIL"} ${name}\n`);

process.exitCode = results.find(({ code }) => code !== 0)?.code ?? 0;
