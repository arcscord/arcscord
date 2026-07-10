import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { compareSemver, parseSemver, resolveApiDocVersions } from "../api-doc-versions.mjs";

describe("api documentation versions", () => {
  it("detects prereleases from their SemVer tag", () => {
    assert.deepEqual(parseSemver("1.0.0-next.1")?.prerelease, ["next", "1"]);
    assert.deepEqual(parseSemver("1.0.0")?.prerelease, []);
  });

  it("orders prerelease identifiers according to SemVer", () => {
    assert.ok(compareSemver("1.0.0-next.10", "1.0.0-next.2") > 0);
    assert.ok(compareSemver("1.0.0", "1.0.0-rc.1") > 0);
  });

  it("keeps the latest stable snapshot as the default", () => {
    assert.deepEqual(
      resolveApiDocVersions(["0.5.0", "dev", "1.0.0-next.1", "0.5.1"]),
      {
        defaultVersion: "0.5.1",
        latest: "0.5.1",
        versions: ["dev", "1.0.0-next.1", "0.5.1", "0.5.0"],
      },
    );
  });

  it("uses a prerelease when no stable snapshot exists", () => {
    assert.deepEqual(
      resolveApiDocVersions(["dev", "1.0.0-next.1", "1.0.0-next.2"]),
      {
        defaultVersion: "1.0.0-next.2",
        latest: "1.0.0-next.2",
        versions: ["dev", "1.0.0-next.2", "1.0.0-next.1"],
      },
    );
  });

  it("falls back to dev when no release snapshot exists", () => {
    assert.deepEqual(resolveApiDocVersions(["dev"]), {
      defaultVersion: "dev",
      latest: "dev",
      versions: ["dev"],
    });
  });
});
