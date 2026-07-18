/**
 * Builds the workspace once and packs the publishable packages a single time
 * into a neutral staging folder (`test/compat/vendor/`), then distributes the
 * stable-named tarballs into every compatibility consumer's own `vendor/`.
 *
 * Replaces the old per-consumer pack scripts (`bun-compat.mjs`,
 * `typescript-compat.mjs`) which each rebuilt + re-packed `arcscord`, so the
 * build and the `arcscord` pack now happen exactly once.
 *
 * Pass `--skip-build` when the workspace was already built in the current job
 * (CI's `Building` job does this).
 *
 * The staging tarballs are what CI uploads as artifacts; the consumer copies
 * let local `pnpm test:bun` / `test:typescript-compat` / `test:node-compat`
 * install from `file:vendor/*.tgz` without repacking.
 */
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readdir, rename, rm } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const stagingDir = new URL("test/compat/vendor/", rootDir);

// Publishable packages to pack. `prefix` is how `pnpm pack` names the tarball
// before we normalize it to the stable `target` name.
const packages = {
  error: {
    directory: new URL("packages/error/", rootDir),
    prefix: "arcscord-error",
    target: "error.tgz",
    installedName: "@arcscord/error",
  },
  components: {
    directory: new URL("packages/components/", rootDir),
    prefix: "arcscord-components",
    target: "components.tgz",
    installedName: "@arcscord/components",
  },
  arcscord: {
    directory: new URL("packages/arcscord/", rootDir),
    prefix: "arcscord",
    target: "arcscord.tgz",
    installedName: "arcscord",
  },
  middleware: {
    directory: new URL("packages/middleware/", rootDir),
    prefix: "arcscord-middleware",
    target: "middleware.tgz",
    installedName: "@arcscord/middleware",
  },
};

// Which packages each consumer fixture installs from its own `vendor/`.
const consumers = [
  { dir: "test/compat/bun-consumer/", packages: ["error", "components", "arcscord"] },
  { dir: "test/compat/typescript-consumer/", packages: ["error", "components", "arcscord", "middleware"] },
  { dir: "test/compat/node-consumer/", packages: ["error", "components", "arcscord"] },
];

function runPnpm(args, cwd) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  execFileSync(command, args, { cwd: fileURLToPath(cwd), stdio: "inherit" });
}

// 1. Build the whole workspace (unless a CI job already did).
if (!process.argv.includes("--skip-build")) {
  console.log("→ Building workspace...");
  runPnpm(["build"], rootDir);
}

// 2. Reset the staging folder and pack each package into it once.
await rm(stagingDir, { recursive: true, force: true });
await mkdir(stagingDir, { recursive: true });

for (const pkg of Object.values(packages)) {
  console.log(`→ Packing ${pkg.prefix}...`);
  runPnpm(["pack", "--pack-destination", fileURLToPath(stagingDir)], pkg.directory);

  const files = await readdir(fileURLToPath(stagingDir));
  const tarball = files.find(file => file.startsWith(pkg.prefix) && file.endsWith(".tgz"));
  if (!tarball) {
    throw new Error(`Failed to find packed ${pkg.prefix} tarball in ${fileURLToPath(stagingDir)}`);
  }

  await rename(new URL(tarball, stagingDir), new URL(pkg.target, stagingDir));
  console.log(`→ Packed ${tarball} → test/compat/vendor/${pkg.target}`);
}

// 3. Distribute the staged tarballs into each consumer's own vendor/ folder,
// and drop any stale extracted copy so the next install re-extracts the fresh
// tarball (the `file:` spec and version can be unchanged across repacks).
for (const consumer of consumers) {
  const consumerDir = new URL(consumer.dir, rootDir);
  const vendorDir = new URL("vendor/", consumerDir);
  await mkdir(vendorDir, { recursive: true });

  for (const name of consumer.packages) {
    const pkg = packages[name];
    await copyFile(new URL(pkg.target, stagingDir), new URL(pkg.target, vendorDir));
    await rm(new URL(`node_modules/${pkg.installedName}/`, consumerDir), {
      recursive: true,
      force: true,
    });
  }
  console.log(`→ Vendored ${consumer.packages.join(", ")} into ${consumer.dir}vendor/`);
}
