import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const targetRoot = process.argv[2];
const selectedPackages = new Set(
  (process.env.RELEASE_PACKAGES ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean),
);

if (!targetRoot) {
  console.error("Missing target directory argument.");
  process.exit(1);
}

if (selectedPackages.size === 0) {
  console.error("RELEASE_PACKAGES is empty.");
  process.exit(1);
}

const packages = [
  { dir: "packages/arcscord", slug: "arcscord" },
  { dir: "packages/components", slug: "components" },
  { dir: "packages/middleware", slug: "middleware" },
  { dir: "packages/error", slug: "error" },
  { dir: "packages/better_error", slug: "better-error" },
];

for (const pkg of packages.filter(pkg => selectedPackages.has(pkg.slug))) {
  const packageJson = JSON.parse(readFileSync(join(root, pkg.dir, "package.json"), "utf8"));
  const source = join(root, "website/static/api", pkg.slug, `${packageJson.version}.json`);
  const targetDir = join(targetRoot, "website/static/api", pkg.slug);
  const target = join(targetDir, `${packageJson.version}.json`);

  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, target);
  console.log(`Prepared ${pkg.slug} ${packageJson.version} API snapshot.`);
}
