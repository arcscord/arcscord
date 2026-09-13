import { appendFileSync } from "node:fs";

import { requireEnvironment, runCli } from "../shared/cli.mts";

await runCli(() => {
  const packageName = requireEnvironment("PACKAGE_NAME");
  const packageVersion = requireEnvironment("PACKAGE_VERSION");
  const releaseTag = requireEnvironment("RELEASE_TAG");
  const distTag = requireEnvironment("DIST_TAG");
  const sha256 = requireEnvironment("SHA256");
  const summaryPath = requireEnvironment("GITHUB_STEP_SUMMARY");
  const summary = [
    "## npm release staged",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Package | \`${packageName}\` |`,
    `| Version | \`${packageVersion}\` |`,
    `| Git tag | \`${releaseTag}\` |`,
    `| npm dist-tag | \`${distTag}\` |`,
    `| Tarball SHA-256 | \`${sha256}\` |`,
    "",
    `Review the staged tarball on npm, approve it with 2FA, then create the GitHub Release from \`${releaseTag}\`.`,
    "",
  ].join("\n");

  appendFileSync(summaryPath, summary);
});
