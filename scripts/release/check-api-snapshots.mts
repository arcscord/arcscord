import type { DocumentedReleasePackage, ResolvedReleasePackage } from "./packages.mts";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import process from "node:process";
import { isMainModule, readOption, runCli } from "../shared/cli.mts";
import {
  DOCUMENTED_RELEASE_PACKAGES,

  readReleasePackage,

} from "./packages.mts";

export function findMissingReleaseSnapshots(
  sourceRoot = process.cwd(),
): ResolvedReleasePackage<DocumentedReleasePackage>[] {
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
  await runCli(() => {
    const sourceRootOption = readOption(process.argv.slice(2), "--source-root");
    const sourceRoot = sourceRootOption
      ? resolve(process.cwd(), sourceRootOption)
      : process.cwd();
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
  });
}
