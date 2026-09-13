import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const RELEASE_PACKAGES = Object.freeze([
  { directory: "packages/arcscord", name: "arcscord", slug: "arcscord" },
  { directory: "packages/components", name: "@arcscord/components", slug: "components" },
  { directory: "packages/middleware", name: "@arcscord/middleware", slug: "middleware" },
  { directory: "packages/error", name: "@arcscord/error", slug: "error" },
  { directory: "packages/better_error", name: "@arcscord/better-error", slug: "better-error" },
  { directory: "packages/webhooks", name: "@arcscord/webhooks", slug: "webhooks" },
  { directory: "packages/create-arcscord-bot", name: "create-arcscord-bot" },
]);

export const DOCUMENTED_RELEASE_PACKAGES = Object.freeze(
  RELEASE_PACKAGES.filter(pkg => pkg.slug !== undefined),
);

export function readReleasePackage(sourceRoot, pkg) {
  const manifestPath = join(sourceRoot, pkg.directory, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (manifest.name !== pkg.name) {
    throw new Error(
      `Configured package "${pkg.name}" does not match manifest name "${manifest.name}" at ${manifestPath}.`,
    );
  }

  return { ...pkg, manifest, version: manifest.version };
}

export function isMainModule(metaUrl) {
  return Boolean(
    process.argv[1]
    && metaUrl === pathToFileURL(resolve(process.argv[1])).href,
  );
}
