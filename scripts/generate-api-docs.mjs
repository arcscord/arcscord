import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRootArgIndex = process.argv.indexOf("--source-root");
const outputRootArgIndex = process.argv.indexOf("--output-root");
const sourceRoot = sourceRootArgIndex === -1
  ? scriptRoot
  : resolve(process.cwd(), process.argv[sourceRootArgIndex + 1]);
const outputRoot = outputRootArgIndex === -1
  ? sourceRoot
  : resolve(process.cwd(), process.argv[outputRootArgIndex + 1]);
const channelArgIndex = process.argv.indexOf("--channel");
const channel = channelArgIndex === -1 ? "dev" : process.argv[channelArgIndex + 1];
const packagesArgIndex = process.argv.indexOf("--packages");
const selectedPackages = packagesArgIndex === -1
  ? undefined
  : new Set(process.argv[packagesArgIndex + 1]?.split(",").map(value => value.trim()).filter(Boolean));
const force = process.argv.includes("--force");

if (!["dev", "release"].includes(channel)) {
  console.error(`Invalid docs channel "${channel}". Expected "dev" or "release".`);
  process.exit(1);
}

const packages = [
  {
    dir: "packages/arcscord",
    slug: "arcscord",
    tsconfig: "packages/arcscord/src/tsconfig.json",
  },
  {
    dir: "packages/middleware",
    slug: "middleware",
    tsconfig: "packages/middleware/src/tsconfig.json",
  },
  {
    dir: "packages/error",
    slug: "error",
    tsconfig: "packages/error/src/tsconfig.json",
  },
  {
    dir: "packages/better_error",
    slug: "better-error",
    tsconfig: "packages/better_error/src/tsconfig.json",
  },
];

const arcscordTypedocOptions = {
  externalSymbolLinkMappings: {
    "discord.js": {
      "Client.fetchStickerPacks": "#",
    },
  },
  intentionallyNotExported: [
    "AnyStringSelectMenuComponentHandler",
    "AutocompleteChoicesFor",
    "AutocompleteErrorHandlerInfos",
    "AutocompleteOptionsDef",
    "AutocompleteValueFor",
    "BaseAutocompleteOptions",
    "BaseMessageContext",
    "CommandErrorContext",
    "CommandErrorOptions",
    "ComponentBuilderOptions",
    "ComponentErrorOptions",
    "ContextOptionsDef",
    "EventErrorOptions",
    "HandlerOptions",
    "InteractionErrorOptions",
    "InternalError",
    "MiddlewaresResults",
    "ModalTopLevelComponentInput",
    "NormalizedEventManagerOptions",
    "NormalizedLocaleManagerOptions",
    "RegularCommandErrorHandlerInfos",
    "SelectMenuUsageOptions",
    "StoredCommandHandler",
    "TypedStringMenuOptions",
    "TypedStringSelectSnapshot",
    "WithCustomI18n",
    "WithI18nOptions",
    "ButtonList",
  ],
};

const apiRoot = join(outputRoot, "website/static/api");
const typedocConfigRoot = join(outputRoot, "website/.typedoc");
mkdirSync(apiRoot, { recursive: true });
mkdirSync(typedocConfigRoot, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  defaultPackage: "arcscord",
  packages: {},
};

for (const pkg of packages) {
  const packageJson = JSON.parse(readFileSync(join(sourceRoot, pkg.dir, "package.json"), "utf8"));
  const version = channel === "dev" ? "dev" : packageJson.version;
  const outDir = join(apiRoot, pkg.slug);
  const outFile = join(outDir, `${version}.json`);
  const docsTsconfig = join(typedocConfigRoot, `${pkg.slug}.tsconfig.json`);
  const typedocConfig = join(typedocConfigRoot, `${pkg.slug}.typedoc.json`);
  const shouldGenerate = !selectedPackages
    || selectedPackages.has(pkg.slug)
    || selectedPackages.has(packageJson.name);

  mkdirSync(outDir, { recursive: true });

  if (shouldGenerate && channel === "release" && existsSync(outFile) && !force) {
    console.log(`Skipping ${pkg.slug} ${version}; ${outFile} already exists.`);
  }
  else if (shouldGenerate) {
    writeFileSync(docsTsconfig, `${JSON.stringify({
      extends: join(sourceRoot, pkg.tsconfig),
      include: [join(sourceRoot, pkg.dir, "src/**/*.ts")],
      exclude: [
        join(sourceRoot, pkg.dir, "src/**/*.test.ts"),
        join(sourceRoot, pkg.dir, "src/**/*.no.test.ts"),
        join(sourceRoot, pkg.dir, "tests/**"),
      ],
    }, null, 2)}\n`);
    writeFileSync(typedocConfig, `${JSON.stringify({
      $schema: "https://typedoc.org/schema.json",
      entryPoints: [join(sourceRoot, pkg.dir, "src/index.ts")],
      entryPointStrategy: "resolve",
      excludeInternal: true,
      ...(pkg.slug === "arcscord" ? arcscordTypedocOptions : {}),
      includeVersion: true,
      json: outFile,
      name: packageJson.name,
      tsconfig: docsTsconfig,
    }, null, 2)}\n`);

    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "typedoc",
        "--options",
        typedocConfig,
      ],
      {
        cwd: sourceRoot,
        stdio: "inherit",
      },
    );

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  const files = existsSync(outDir)
    ? Object.fromEntries(
        readdirSync(outDir)
          .filter(file => file.endsWith(".json"))
          .map(file => file.slice(0, -".json".length))
          .sort((a, b) => {
            if (a === "dev")
              return -1;
            if (b === "dev")
              return 1;
            if (a === packageJson.version)
              return -1;
            if (b === packageJson.version)
              return 1;
            return b.localeCompare(a, undefined, { numeric: true });
          })
          .map(fileVersion => [fileVersion, `/api/${pkg.slug}/${fileVersion}.json`]),
      )
    : {};
  const versions = Object.keys(files);
  const defaultVersion = files[packageJson.version]
    ? packageJson.version
    : versions.includes("dev")
      ? "dev"
      : versions[0];

  manifest.packages[pkg.slug] = {
    name: packageJson.name,
    description: packageJson.description ?? "",
    currentVersion: packageJson.version,
    latest: packageJson.version,
    defaultVersion,
    versions,
    files,
  };
}

writeFileSync(join(apiRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
