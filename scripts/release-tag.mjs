import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { isMainModule, readReleasePackage, RELEASE_PACKAGES } from "./release-packages.mjs";

const SEMVER_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(next|beta|alpha|rc)(?:\.(?:0|[1-9]\d*))*)?$/;

export function parseReleaseTag(releaseRef) {
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

export function resolveReleaseTag(releaseRef, sourceRoot = process.cwd()) {
  const release = parseReleaseTag(releaseRef);
  const { manifest } = readReleasePackage(sourceRoot, release);

  if (manifest.version !== release.version) {
    throw new Error(
      `Tag version "${release.version}" does not match ${manifest.name} version "${manifest.version}".`,
    );
  }

  return release;
}

function parseArguments(argv) {
  const tagIndex = argv.indexOf("--tag");
  const sourceRootIndex = argv.indexOf("--source-root");

  if (tagIndex === -1 || !argv[tagIndex + 1])
    throw new Error("Missing required --tag argument.");

  return {
    sourceRoot: sourceRootIndex === -1
      ? process.cwd()
      : resolve(process.cwd(), argv[sourceRootIndex + 1]),
    tag: argv[tagIndex + 1],
  };
}

function writeGitHubOutputs(release) {
  if (!process.env.GITHUB_OUTPUT)
    return;

  const output = [
    `package_name=${release.name}`,
    `package_dir=${release.directory}`,
    `version=${release.version}`,
    `dist_tag=${release.distTag}`,
    `release_tag=${release.tag}`,
  ].join("\n");

  appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
}

if (isMainModule(import.meta.url)) {
  try {
    const { sourceRoot, tag } = parseArguments(process.argv.slice(2));
    const release = resolveReleaseTag(tag, sourceRoot);
    writeGitHubOutputs(release);
    console.log(`${release.tag} resolves to ${release.name}@${release.version} with dist-tag ${release.distTag}.`);
  }
  catch (cause) {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  }
}
