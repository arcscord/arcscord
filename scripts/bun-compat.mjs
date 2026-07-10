/**
 * Builds arcscord and packs it into the Bun consumer project's `vendor/` folder
 * under a stable filename (`arcscord.tgz`) so `test/compat/bun-consumer` can
 * install the *packed* package instead of workspace source.
 *
 * Used by the `bun:pack` / `test:bun` root scripts and by the Bun CI workflow.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const arcscordDir = new URL("packages/arcscord/", rootDir);
const consumerDir = new URL("test/compat/bun-consumer/", rootDir);
const vendorDir = new URL("vendor/", consumerDir);
const installedArcscordDir = new URL("node_modules/arcscord/", consumerDir);

function runPnpm(args, cwd) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  execFileSync(command, args, { cwd: fileURLToPath(cwd), stdio: "inherit" });
}

// 1. Build the whole workspace (arcscord + its @arcscord/* deps).
console.log("→ Building workspace...");
runPnpm(["build"], rootDir);

// 2. Reset the vendor folder and pack arcscord into it.
console.log("→ Packing arcscord...");
await rm(vendorDir, { recursive: true, force: true });
await mkdir(vendorDir, { recursive: true });
runPnpm(["pack", "--pack-destination", fileURLToPath(vendorDir)], arcscordDir);

// 3. Normalize the version-stamped tarball name to a stable `arcscord.tgz`.
const files = await readdir(fileURLToPath(vendorDir));
const tarball = files.find(f => f.startsWith("arcscord") && f.endsWith(".tgz"));
if (!tarball) {
  throw new Error("Failed to find packed arcscord tarball in vendor folder");
}
await rename(
  new URL(tarball, vendorDir),
  new URL("arcscord.tgz", vendorDir),
);

console.log(`→ Packed ${tarball} → vendor/arcscord.tgz`);

// 4. Drop the previously installed arcscord from the consumer.
//
// The dependency spec (`file:./vendor/arcscord.tgz`) and the package version are
// unchanged across repacks, so a subsequent `bun install` can keep the stale
// `node_modules/arcscord` from an earlier install — making typecheck/smoke/tests
// run against old code instead of the tarball just produced. Removing it forces
// `bun install` to re-extract the fresh tarball.
await rm(installedArcscordDir, { recursive: true, force: true });
console.log("→ Removed stale consumer node_modules/arcscord");
