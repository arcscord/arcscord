import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const script = fileURLToPath(new URL("../resolve-release-doc-packages.mjs", import.meta.url));

const packages = [
  { dir: "packages/arcscord", name: "arcscord", version: "3.0.0" },
  { dir: "packages/components", name: "@arcscord/components", version: "1.0.0" },
  { dir: "packages/middleware", name: "@arcscord/middleware", version: "1.0.0" },
  { dir: "packages/error", name: "@arcscord/error", version: "3.0.0" },
  { dir: "packages/better_error", name: "@arcscord/better-error", version: "1.0.0" },
];

function createSourceRoot() {
  const sourceRoot = mkdtempSync(join(tmpdir(), "arcscord-release-doc-packages-"));

  for (const pkg of packages) {
    const packageRoot = join(sourceRoot, pkg.dir);
    mkdirSync(packageRoot, { recursive: true });
    writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ name: pkg.name, version: pkg.version }));
  }

  return sourceRoot;
}

function resolveRelease(releaseRef) {
  return spawnSync(process.execPath, [script, "--source-root", createSourceRoot()], {
    encoding: "utf8",
    env: { ...process.env, RELEASE_REF_NAME: releaseRef },
  });
}

describe("release documentation package resolver", () => {
  it("resolves a scoped package release tag", () => {
    const result = resolveRelease("@arcscord/error@v3.0.0");

    assert.equal(result.status, 0);
    assert.match(result.stdout, /snapshots: error/);
    assert.doesNotMatch(result.stdout, /snapshots: arcscord/);
  });

  it("resolves a fully qualified scoped package release ref", () => {
    const result = resolveRelease("refs/tags/@arcscord/better-error@v1.0.0");

    assert.equal(result.status, 0);
    assert.match(result.stdout, /snapshots: better-error/);
  });

  it("resolves the components package release tag", () => {
    const result = resolveRelease("@arcscord/components@v1.0.0");

    assert.equal(result.status, 0);
    assert.match(result.stdout, /snapshots: components/);
  });

  it("keeps resolving version-only release tags", () => {
    const result = resolveRelease("v3.0.0");

    assert.equal(result.status, 0);
    assert.match(result.stdout, /snapshots: arcscord,error/);
  });
});
