import { appendFileSync, readFileSync } from "node:fs";
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

const packages = [
  { dir: "packages/arcscord", slug: "arcscord" },
  { dir: "packages/middleware", slug: "middleware" },
  { dir: "packages/error", slug: "error" },
  { dir: "packages/better_error", slug: "better-error" },
];

const matches = packages
  .map((pkg) => {
    const packageJson = JSON.parse(readFileSync(join(sourceRoot, pkg.dir, "package.json"), "utf8"));
    return { ...pkg, name: packageJson.name, version: packageJson.version };
  })
  .filter(pkg => pkg.version === releaseVersion);

if (matches.length === 0) {
  console.error(`No package version matches release ref "${releaseRef}" (normalized to "${releaseVersion}").`);
  process.exit(1);
}

const slugs = matches.map(pkg => pkg.slug).join(",");
console.log(`Release ${releaseRef} matches API package snapshots: ${slugs}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `packages=${slugs}\n`);
}
