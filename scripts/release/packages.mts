import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ReleasePackage = {
  directory: string;
  name: string;
  slug?: string;
};

export type DocumentedReleasePackage = ReleasePackage & {
  slug: string;
};

export type PackageManifest = {
  description?: string;
  name: string;
  version: string;
};

export type ResolvedReleasePackage<TPackage extends ReleasePackage = ReleasePackage> = TPackage & {
  manifest: PackageManifest;
  version: string;
};

export const RELEASE_PACKAGES = Object.freeze([
  { directory: "packages/arcscord", name: "arcscord", slug: "arcscord" },
  { directory: "packages/components", name: "@arcscord/components", slug: "components" },
  { directory: "packages/middleware", name: "@arcscord/middleware", slug: "middleware" },
  { directory: "packages/error", name: "@arcscord/error", slug: "error" },
  { directory: "packages/better_error", name: "@arcscord/better-error", slug: "better-error" },
  { directory: "packages/webhooks", name: "@arcscord/webhooks", slug: "webhooks" },
  { directory: "packages/create-arcscord-bot", name: "create-arcscord-bot" },
] satisfies readonly ReleasePackage[]);

export const DOCUMENTED_RELEASE_PACKAGES = Object.freeze(
  RELEASE_PACKAGES.filter((pkg): pkg is DocumentedReleasePackage => pkg.slug !== undefined),
);

export function readReleasePackage<TPackage extends ReleasePackage>(
  sourceRoot: string,
  pkg: TPackage,
): ResolvedReleasePackage<TPackage> {
  const manifestPath = join(sourceRoot, pkg.directory, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;

  if (manifest.name !== pkg.name) {
    throw new Error(
      `Configured package "${pkg.name}" does not match manifest name "${manifest.name}" at ${manifestPath}.`,
    );
  }

  return { ...pkg, manifest, version: manifest.version };
}
