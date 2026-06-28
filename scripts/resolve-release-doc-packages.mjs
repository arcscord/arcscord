import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const sourceRootArgIndex = process.argv.indexOf("--source-root");
const sourceRoot = sourceRootArgIndex === -1
  ? process.cwd()
  : resolve(process.cwd(), process.argv[sourceRootArgIndex + 1]);
const releaseRef = process.env.RELEASE_REF_NAME ?? "";
const releaseVersion = releaseRef
  .replace(/^refs\/tags\//, "")
  .replace(/^v/, "");

// When no release ref is provided (manual run), switch to detection mode:
// pick every package whose current version has no committed API snapshot yet.
// This lets a docs refresh ship for mini bumps (bug fix, readme, ...) without
// cutting a GitHub release.
const detectMode = releaseVersion === "";

const packages = [
  { dir: "packages/arcscord", slug: "arcscord" },
  { dir: "packages/middleware", slug: "middleware" },
  { dir: "packages/error", slug: "error" },
  { dir: "packages/better_error", slug: "better-error" },
];

const resolved = packages.map((pkg) => {
  const packageJson = JSON.parse(readFileSync(join(sourceRoot, pkg.dir, "package.json"), "utf8"));
  return { ...pkg, name: packageJson.name, version: packageJson.version };
});

const matches = detectMode
  ? resolved.filter(pkg => !existsSync(join(sourceRoot, "website/static/api", pkg.slug, `${pkg.version}.json`)))
  : resolved.filter(pkg => pkg.version === releaseVersion);

if (matches.length === 0) {
  if (detectMode) {
    console.log("No package needs a new API snapshot; every current version already has one.");
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, "packages=\n");
      appendFileSync(process.env.GITHUB_OUTPUT, "label=\n");
    }
    process.exit(0);
  }

  console.error(`No package version matches release ref "${releaseRef}" (normalized to "${releaseVersion}").`);
  process.exit(1);
}

const slugs = matches.map(pkg => pkg.slug).join(",");
const label = detectMode
  ? matches.map(pkg => `${pkg.slug}@${pkg.version}`).join(", ")
  : releaseRef;

console.log(detectMode
  ? `Detected packages needing API snapshots: ${label}`
  : `Release ${releaseRef} matches API package snapshots: ${slugs}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `packages=${slugs}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `label=${label}\n`);
}
