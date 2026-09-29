import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { appendGitHubOutputs, isMainModule, requireEnvironment, requireOption, runCli } from "../shared/cli.mts";

type PackedManifest = {
  name?: string;
  version?: string;
  [key: string]: unknown;
};

function run(command: string, args: readonly string[], options: { cwd?: string } = {}): string {
  return execFileSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

export function packRelease(
  packageDirectory: string,
  packageName: string,
  packageVersion: string,
  temporaryRoot: string,
): { sha256: string; tarball: string } {
  const releaseDirectory = join(temporaryRoot, "arcscord-release");
  rmSync(releaseDirectory, { recursive: true, force: true });
  mkdirSync(releaseDirectory, { recursive: true });

  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  run(pnpm, ["pack", "--pack-destination", releaseDirectory], { cwd: packageDirectory });

  const tarballs = readdirSync(releaseDirectory).filter(file => file.endsWith(".tgz"));
  if (tarballs.length !== 1)
    throw new Error(`Expected one release tarball, found ${tarballs.length}.`);

  const tarball = join(releaseDirectory, tarballs[0]);
  const packedManifest = JSON.parse(
    run("tar", ["-xOf", tarball, "package/package.json"]),
  ) as PackedManifest;

  if (packedManifest.name !== packageName || packedManifest.version !== packageVersion) {
    throw new Error(
      `Packed manifest is ${packedManifest.name ?? "unknown"}@${packedManifest.version ?? "unknown"}.`,
    );
  }
  if (JSON.stringify(packedManifest).includes("workspace:"))
    throw new Error("Packed manifest still contains a workspace protocol.");

  const sha256 = createHash("sha256")
    .update(readFileSync(tarball))
    .digest("hex");

  return { sha256, tarball };
}

if (isMainModule(import.meta.url)) {
  await runCli(() => {
    const argv = process.argv.slice(2);
    const result = packRelease(
      requireOption(argv, "--directory"),
      requireOption(argv, "--package"),
      requireOption(argv, "--version"),
      requireEnvironment("RUNNER_TEMP"),
    );

    appendGitHubOutputs(result);
    console.log(`Packed ${result.tarball} (${result.sha256}).`);
  });
}
