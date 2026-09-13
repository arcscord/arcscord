import type { ReleasePackage } from "./packages.mts";
import { resolve } from "node:path";

import process from "node:process";
import { appendGitHubOutputs, isMainModule, readOption, requireOption, runCli } from "../shared/cli.mts";
import { readReleasePackage, RELEASE_PACKAGES } from "./packages.mts";

const SEMVER_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(next|beta|alpha|rc)(?:\.(?:0|[1-9]\d*))*)?$/;

export type ResolvedReleaseTag = ReleasePackage & {
  distTag: string;
  tag: string;
  version: string;
};

export function parseReleaseTag(releaseRef: string): ResolvedReleaseTag {
  const tag = releaseRef.replace(/^refs\/tags\//, "");
  const pkg = RELEASE_PACKAGES.find(({ name }) => tag.startsWith(`${name}@v`));

  if (!pkg)
    throw new Error(`Unknown release tag "${releaseRef}".`);

  const version = tag.slice(`${pkg.name}@v`.length);
  const match = SEMVER_PATTERN.exec(version);
  if (!match) {
    throw new Error(
      `Invalid version "${version}". Use SemVer and only next, beta, alpha, or rc prerelease channels.`,
    );
  }

  return {
    ...pkg,
    distTag: match[1] ?? "latest",
    tag,
    version,
  };
}

export function resolveReleaseTag(
  releaseRef: string,
  sourceRoot = process.cwd(),
): ResolvedReleaseTag {
  const release = parseReleaseTag(releaseRef);
  const { manifest } = readReleasePackage(sourceRoot, release);

  if (manifest.version !== release.version) {
    throw new Error(
      `Tag version "${release.version}" does not match ${manifest.name} version "${manifest.version}".`,
    );
  }

  return release;
}

if (isMainModule(import.meta.url)) {
  await runCli(() => {
    const argv = process.argv.slice(2);
    const sourceRootOption = readOption(argv, "--source-root");
    const sourceRoot = sourceRootOption
      ? resolve(process.cwd(), sourceRootOption)
      : process.cwd();
    const release = resolveReleaseTag(requireOption(argv, "--tag"), sourceRoot);

    appendGitHubOutputs({
      package_name: release.name,
      package_dir: release.directory,
      version: release.version,
      dist_tag: release.distTag,
      release_tag: release.tag,
    });
    console.log(`${release.tag} resolves to ${release.name}@${release.version} with dist-tag ${release.distTag}.`);
  });
}
