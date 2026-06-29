/**
 * Builds arcscord and packs it into the Bun consumer project's `vendor/` folder
 * under a stable filename (`arcscord.tgz`) so `test/compat/bun-consumer` can
 * install the *packed* package instead of workspace source.
 *
 * Used by the `bun:pack` / `test:bun` root scripts and by the Bun CI workflow.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const arcscordDir = new URL("packages/arcscord/", rootDir);
const vendorDir = new URL("test/compat/bun-consumer/vendor/", rootDir);

// `shell: true` lets the platform shell resolve the `pnpm` shim regardless of
// how it was installed (pnpm.cmd / pnpm.exe on Windows, pnpm on Unix). Args are
// static and trusted, so there is no injection concern.
function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd: fileURLToPath(cwd), stdio: "inherit", shell: true });
}

// 1. Build the whole workspace (arcscord + its @arcscord/* deps).
console.log("→ Building workspace...");
run("pnpm", ["build"], rootDir);

// 2. Reset the vendor folder and pack arcscord into it.
console.log("→ Packing arcscord...");
await rm(vendorDir, { recursive: true, force: true });
await mkdir(vendorDir, { recursive: true });
run("pnpm", ["pack", "--pack-destination", fileURLToPath(vendorDir)], arcscordDir);

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
