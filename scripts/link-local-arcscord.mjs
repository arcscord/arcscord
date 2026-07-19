/**
 * Points a standalone example at the *local repo builds* of arcscord (and its
 * `@arcscord/error` dependency, plus `@arcscord/middleware`) instead of the
 * published npm versions, by injecting a pnpm `overrides:` block into the
 * shared examples workspace.
 *
 * The example's committed `package.json` keeps the published version spec (so a
 * user who clones the branch gets a runnable example against the release); this
 * override is applied only in CI on the ephemeral checkout, before running
 * `pnpm install --no-lockfile` (because the override changes resolution for
 * arcscord/middleware).
 *
 * Usage: node scripts/link-local-arcscord.mjs <exampleDir> <tarballDir>
 *   <exampleDir>  path to the example (e.g. examples/starter-bot)
 *   <tarballDir>  dir holding error.tgz / arcscord.tgz / middleware.tgz
 *                 (staging or the downloaded CI artifact)
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [exampleArg, tarballArg] = process.argv.slice(2);
if (!exampleArg || !tarballArg) {
  console.error("Usage: node scripts/link-local-arcscord.mjs <exampleDir> <tarballDir>");
  process.exit(1);
}

const exampleDir = path.resolve(exampleArg);
const tarballDir = path.resolve(tarballArg);

// Local packages that can shadow their published counterparts, mapped to the
// stable tarball name produced by scripts/pack-local.mjs.
const localPackages = {
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
};

const pkg = JSON.parse(await readFile(path.join(exampleDir, "package.json"), "utf8"));
const declared = { ...pkg.dependencies, ...pkg.devDependencies };

const overrides = [];
for (const [name, { tarball, transitiveOf = [] }] of Object.entries(localPackages)) {
  if (declared[name] || transitiveOf.some(dependency => declared[dependency])) {
    // Absolute file: path so resolution is independent of the workspace cwd.
    const tarballPath = path.join(tarballDir, tarball);
    overrides.push(`  "${name}": "file:${tarballPath}"`);
  }
}

if (overrides.length === 0) {
  console.log(`→ ${exampleArg} depends on none of ${Object.keys(localPackages).join(", ")}; nothing to override.`);
  process.exit(0);
}

const workspacePath = path.join(exampleDir, "..", "pnpm-workspace.yaml");
const workspace = await readFile(workspacePath, "utf8");

if (/^overrides:/m.test(workspace)) {
  throw new Error(
    `${workspacePath} already defines "overrides:"; merge the local tarball entries manually.`,
  );
}

const block = `\noverrides:\n${overrides.join("\n")}\n`;
await writeFile(workspacePath, `${workspace.replace(/\s*$/, "")}\n${block}`);

console.log(`→ Injected local overrides into ${path.relative(process.cwd(), workspacePath)}:`);
for (const line of overrides)
  console.log(`    ${line.trim()}`);
