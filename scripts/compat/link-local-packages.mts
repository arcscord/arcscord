/**
 * Points a standalone example at the *local repo builds* of arcscord (and its
 * `@arcscord/error` dependency, `@arcscord/middleware`, and
 * `@arcscord/webhooks`) instead of the
 * published npm versions, by adding pnpm overrides to the
 * shared examples workspace.
 *
 * The example's committed `package.json` keeps the published version spec (so a
 * user who clones the branch gets a runnable example against the release); this
 * override is applied only in CI on the ephemeral checkout. CI allows an
 * ephemeral lockfile update for the local tarballs while retaining all other
 * committed dependency resolutions.
 *
 * Usage: node scripts/compat/link-local-packages.mts <exampleDir> <tarballDir>
 *   <exampleDir>  path to the example (e.g. examples/starter-bot)
 *   <tarballDir>  dir holding error.tgz / arcscord.tgz / middleware.tgz
 *                 (staging or the downloaded CI artifact)
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [exampleArg, tarballArg] = process.argv.slice(2);
if (!exampleArg || !tarballArg) {
  console.error("Usage: node scripts/compat/link-local-packages.mts <exampleDir> <tarballDir>");
  process.exit(1);
}

const exampleDir = path.resolve(exampleArg);
const tarballDir = path.resolve(tarballArg);

// Local packages that can shadow their published counterparts, mapped to the
// stable tarball name produced by scripts/compat/pack-local.mts.
type LocalPackage = {
  tarball: string;
  transitiveOf?: string[];
};

type ExampleManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const localPackages: Record<string, LocalPackage> = {
  "@arcscord/components": {
    tarball: "components.tgz",
    transitiveOf: ["arcscord"],
  },
  "@arcscord/error": {
    tarball: "error.tgz",
    transitiveOf: ["arcscord", "@arcscord/middleware"],
  },
  "arcscord": { tarball: "arcscord.tgz" },
  "@arcscord/middleware": { tarball: "middleware.tgz" },
  "@arcscord/webhooks": { tarball: "webhooks.tgz" },
};

const pkg = JSON.parse(
  await readFile(path.join(exampleDir, "package.json"), "utf8"),
) as ExampleManifest;
const declared = { ...pkg.dependencies, ...pkg.devDependencies };

const overrides: Record<string, string> = {};
for (const [name, { tarball, transitiveOf = [] }] of Object.entries(localPackages)) {
  if (declared[name] || transitiveOf.some(dependency => declared[dependency])) {
    // Absolute file: path so resolution is independent of the workspace cwd.
    overrides[name] = `file:${path.join(tarballDir, tarball)}`;
  }
}

if (Object.keys(overrides).length === 0) {
  console.log(`→ ${exampleArg} depends on none of ${Object.keys(localPackages).join(", ")}; nothing to override.`);
  process.exit(0);
}

const cwd = path.dirname(exampleDir);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const configOptions = ["--location=project", "--json", "overrides"];
const overridesJson = execFileSync(pnpm, ["config", "get", ...configOptions], { cwd, encoding: "utf8" });
const existing = JSON.parse(overridesJson) as Record<string, string> | null;
execFileSync(pnpm, ["config", "set", ...configOptions, JSON.stringify({ ...existing, ...overrides })], { cwd });

const workspacePath = path.join(cwd, "pnpm-workspace.yaml");
console.log(`→ Injected local overrides into ${path.relative(process.cwd(), workspacePath)}:`);
for (const [name, specifier] of Object.entries(overrides))
  console.log(`    ${name}: ${specifier}`);
