import { spawnSync } from "node:child_process";
import process from "node:process";

import { isMainModule, requireOption, runCli } from "../shared/cli.mts";

export type NpmVersionAvailability = "available" | "exists" | "unknown";

export function checkNpmVersion(packageName: string, packageVersion: string): NpmVersionAvailability {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["view", `${packageName}@${packageVersion}`, "version"],
    { encoding: "utf8" },
  );

  if (result.error)
    throw result.error;
  if (result.status === 0)
    return "exists";

  const output = `${result.stdout}${result.stderr}`;
  if (output.includes("E404"))
    return "available";

  if (output)
    process.stderr.write(output);
  return "unknown";
}

if (isMainModule(import.meta.url)) {
  await runCli(() => {
    const argv = process.argv.slice(2);
    const packageName = requireOption(argv, "--package");
    const packageVersion = requireOption(argv, "--version");
    const availability = checkNpmVersion(packageName, packageVersion);

    if (availability === "exists")
      throw new Error(`${packageName}@${packageVersion} already exists on npm.`);
    if (availability === "unknown")
      throw new Error("Unable to verify whether the version already exists on npm.");

    console.log(`${packageName}@${packageVersion} is available on npm.`);
  });
}
