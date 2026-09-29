import { spawnSync } from "node:child_process";
import process from "node:process";

import { requireOption, runCli } from "../shared/cli.mts";

function runGit(args: readonly string[], allowFailure = false): number {
  const result = spawnSync("git", args, { stdio: "inherit" });

  if (result.error)
    throw result.error;

  const status = result.status ?? 1;
  if (status !== 0 && !allowFailure)
    throw new Error(`git ${args.join(" ")} failed with exit code ${status}.`);

  return status;
}

await runCli(() => {
  const releaseSha = requireOption(process.argv.slice(2), "--sha");

  runGit(["fetch", "--no-tags", "origin", "main:refs/remotes/origin/main"]);
  const status = runGit(
    ["merge-base", "--is-ancestor", releaseSha, "refs/remotes/origin/main"],
    true,
  );

  if (status !== 0)
    throw new Error("The release tag must point to a commit contained in main.");

  console.log(`${releaseSha} is contained in origin/main.`);
});
