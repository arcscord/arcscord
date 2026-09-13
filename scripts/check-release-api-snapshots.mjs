import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

import { DOCUMENTED_RELEASE_PACKAGES, isMainModule, readReleasePackage } from "./release-packages.mjs";

export function findMissingReleaseSnapshots(sourceRoot = process.cwd()) {
  return DOCUMENTED_RELEASE_PACKAGES
    .map(pkg => readReleasePackage(sourceRoot, pkg))
    .filter(pkg => !existsSync(join(
      sourceRoot,
      "website/static/api",
      pkg.slug,
      `${pkg.version}.json`,
    )));
}

if (isMainModule(import.meta.url)) {
  const sourceRootIndex = process.argv.indexOf("--source-root");
  const sourceRoot = sourceRootIndex === -1
    ? process.cwd()
    : resolve(process.cwd(), process.argv[sourceRootIndex + 1]);
  const missing = findMissingReleaseSnapshots(sourceRoot);

  if (missing.length > 0) {
    console.error("Missing committed release API snapshots:");
    for (const pkg of missing)
      console.error(`- ${pkg.name}@${pkg.version}`);
    console.error("Run pnpm docs:api:release and commit the generated snapshots in the release PR.");
    process.exitCode = 1;
  }
  else {
    console.log("Every documented package version has a committed API snapshot.");
  }
}
