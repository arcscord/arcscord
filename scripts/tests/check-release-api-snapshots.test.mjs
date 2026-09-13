import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";

import { findMissingReleaseSnapshots } from "../check-release-api-snapshots.mjs";
import { DOCUMENTED_RELEASE_PACKAGES } from "../release-packages.mjs";

function createSourceRoot(missingSlug) {
  const sourceRoot = mkdtempSync(join(tmpdir(), "arcscord-release-snapshots-"));

  for (const pkg of DOCUMENTED_RELEASE_PACKAGES) {
    const packageRoot = join(sourceRoot, pkg.directory);
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(join(packageRoot, "package.json"), JSON.stringify({
      name: pkg.name,
      version: "1.2.3",
    }));

    if (pkg.slug !== missingSlug) {
      const snapshotRoot = join(sourceRoot, "website/static/api", pkg.slug);
      mkdirSync(snapshotRoot, { recursive: true });
      writeFileSync(join(snapshotRoot, "1.2.3.json"), "{}");
    }
  }

  return sourceRoot;
}

describe("release API snapshot validation", () => {
  it("accepts a snapshot for every documented package version", () => {
    assert.deepEqual(findMissingReleaseSnapshots(createSourceRoot()), []);
  });

  it("reports the package whose current snapshot is missing", () => {
    const missing = findMissingReleaseSnapshots(createSourceRoot("middleware"));

    assert.equal(missing.length, 1);
    assert.equal(missing[0].name, "@arcscord/middleware");
    assert.equal(missing[0].version, "1.2.3");
  });
});
