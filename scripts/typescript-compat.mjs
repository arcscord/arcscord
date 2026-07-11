/**
 * Builds and packs arcscord for the minimum-TypeScript consumer fixture.
 * Pass `--skip-build` when the workspace was already built in the current job.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const consumerDir = new URL("test/compat/typescript-consumer/", rootDir);
const vendorDir = new URL("vendor/", consumerDir);
const packages = [
  { directory: new URL("packages/arcscord/", rootDir), prefix: "arcscord", target: "arcscord.tgz" },
  { directory: new URL("packages/middleware/", rootDir), prefix: "arcscord-middleware", target: "middleware.tgz" },
];

function runPnpm(args, cwd) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  execFileSync(command, args, { cwd: fileURLToPath(cwd), stdio: "inherit" });
}

if (!process.argv.includes("--skip-build")) {
  console.log("→ Building workspace...");
  runPnpm(["build"], rootDir);
}

await rm(vendorDir, { recursive: true, force: true });
await mkdir(vendorDir, { recursive: true });

for (const packageToPack of packages) {
  console.log(`→ Packing ${packageToPack.prefix} for TypeScript 5.4...`);
  runPnpm(["pack", "--pack-destination", fileURLToPath(vendorDir)], packageToPack.directory);

  const files = await readdir(fileURLToPath(vendorDir));
  const tarball = files.find(file => file.startsWith(packageToPack.prefix) && file.endsWith(".tgz"));
  if (!tarball) {
    throw new Error(`Failed to find packed ${packageToPack.prefix} tarball in vendor folder`);
  }

  await rename(new URL(tarball, vendorDir), new URL(packageToPack.target, vendorDir));
  console.log(`→ Packed ${tarball} → vendor/${packageToPack.target}`);
}

await rm(new URL("node_modules/arcscord/", consumerDir), { recursive: true, force: true });
await rm(new URL("node_modules/@arcscord/middleware/", consumerDir), { recursive: true, force: true });
