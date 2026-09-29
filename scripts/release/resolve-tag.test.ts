import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { RELEASE_PACKAGES } from "./packages.mts";
import { parseReleaseTag, resolveReleaseTag } from "./resolve-tag.mts";

function createSourceRoot(overrides: Readonly<Record<string, string>> = {}): string {
  const sourceRoot = mkdtempSync(join(tmpdir(), "arcscord-release-tag-"));

  for (const pkg of RELEASE_PACKAGES) {
    const packageRoot = join(sourceRoot, pkg.directory);
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(join(packageRoot, "package.json"), JSON.stringify({
      name: pkg.name,
      version: overrides[pkg.name] ?? "1.2.3",
    }));
  }

  return sourceRoot;
}

describe("release tag validation", () => {
  it.each(RELEASE_PACKAGES)("maps $name to $directory", (pkg) => {
    const release = resolveReleaseTag(`${pkg.name}@v1.2.3`, createSourceRoot());

    assert.equal(release.name, pkg.name);
    assert.equal(release.directory, pkg.directory);
    assert.equal(release.distTag, "latest");
  });

  it.each(["next", "beta", "alpha", "rc"])("uses the %s prerelease channel as dist-tag", (channel) => {
    const release = parseReleaseTag(`arcscord@v2.0.0-${channel}.1`);

    assert.equal(release.distTag, channel);
  });

  it("accepts a fully qualified tag ref", () => {
    const release = resolveReleaseTag(
      "refs/tags/@arcscord/better-error@v1.2.3",
      createSourceRoot(),
    );

    assert.equal(release.directory, "packages/better_error");
  });

  it("rejects unknown packages and legacy tags", () => {
    assert.throws(() => parseReleaseTag("v1.2.3"), /Unknown release tag/);
    assert.throws(() => parseReleaseTag("unknown@v1.2.3"), /Unknown release tag/);
  });

  it("rejects unsupported or malformed prerelease versions", () => {
    assert.throws(() => parseReleaseTag("arcscord@v1.2.3-dev.1"), /Invalid version/);
    assert.throws(() => parseReleaseTag("arcscord@v01.2.3"), /Invalid version/);
    assert.throws(() => parseReleaseTag("arcscord@v1.2"), /Invalid version/);
  });

  it("rejects a tag whose version differs from the manifest", () => {
    const sourceRoot = createSourceRoot({ arcscord: "1.2.4" });

    assert.throws(
      () => resolveReleaseTag("arcscord@v1.2.3", sourceRoot),
      /does not match arcscord version "1.2.4"/,
    );
  });
});
