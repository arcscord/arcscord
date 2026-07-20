import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { resolveApiDocVersions } from "./api-doc-versions.mjs";

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
    tsconfig: "packages/arcscord/tsconfig.json",
    docsEntryPoints: ["src/base/utils/context.type.ts"],
  },
  {
    dir: "packages/components",
    slug: "components",
    tsconfig: "packages/components/tsconfig.json",
  },
  {
    dir: "packages/middleware",
    slug: "middleware",
    tsconfig: "packages/middleware/tsconfig.json",
  },
  {
    dir: "packages/error",
    slug: "error",
    tsconfig: "packages/error/tsconfig.json",
  },
  {
    dir: "packages/better_error",
    slug: "better-error",
    tsconfig: "packages/better_error/tsconfig.json",
  },
];

const arcscordTypedocOptions = {
  // Fail the docs build on undocumented public exports, broken {@link} targets,
  // or public API referencing non-exported symbols absent from
  // `intentionallyNotExported`. `requiredToBeDocumented` scopes the coverage check
  // to top-level exported declarations (properties/enum members are not required).
  treatWarningsAsErrors: true,
  validation: {
    notExported: true,
    notDocumented: true,
    invalidLink: true,
  },
  requiredToBeDocumented: [
    "Enum",
    "Variable",
    "Function",
    "Class",
    "Interface",
    "TypeAlias",
  ],
  externalSymbolLinkMappings: {
    "discord.js": {
      "Client.fetchStickerPacks": "#",
    },
  },
  // Internal types referenced by the public API but intentionally not exported
  // from the barrel. Kept sorted. `notExported` validation fails the build if a
  // documented symbol references an internal type missing from this list.
  intentionallyNotExported: [
    "AnyCommandHandler",
    "AnyModalComponentHandler",
    "AnyStringSelectMenuComponentHandler",
    "AnySubCommandHandler",
    "AutocompleteChoicesFor",
    "AutocompleteOptionsDef",
    "AutocompleteValueFor",
    "BaseAutocompleteOptions",
    "BaseCommandContextBuilderOptions",
    "BaseCommandResultHandlerInfos",
    "BaseComponentContextOptions",
    "BaseComponentResultHandlerInfos",
    "BaseEventResultHandlerInfos",
    "BaseMessageContext",
    "BuildableHandler",
    "ChannelSelectMenuContextOptions",
    "CommandResultHandlerImplementer",
    "ContextOptionsDef",
    "FullCommandInput",
    "HandlerOptions",
    "InteractionErrorContext",
    "MentionableSelectMenuContextOptions",
    "MessageCommandContextBuilderOptions",
    "MiddlewaresResults",
    "ModalContextOptions",
    "ModalContextValue",
    "NormalizedEventManagerOptions",
    "NormalizedLocaleManagerOptions",
    "RoleSelectMenuContextOptions",
    "SelectMenuUsageOptions",
    "SlashCommandContextBuilderOptions",
    "StoredCommandHandler",
    "StringSelectMenuContextOptions",
    "StringSelectMenuValues",
    "SubCommandInput",
    "TypedStringMenuOptions",
    "UserCommandContextBuilderOptions",
    "UserSelectMenuContextOptions",
    "WithCustomI18n",
    "WithI18nOptions",
  ],
};

const errorTypedocOptions = {
  // Implementation-only aliases used to keep `multipleParallel`'s public
  // signature readable. They are intentionally not part of the package API.
  intentionallyNotExported: [
    "AnyMultipleCallback",
    "CallbackError",
    "CallbackValue",
  ],
};

const componentsTypedocOptions = {
  treatWarningsAsErrors: true,
  validation: {
    notExported: true,
    notDocumented: true,
    invalidLink: true,
  },
  requiredToBeDocumented: [
    "Function",
    "TypeAlias",
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
        join(sourceRoot, pkg.dir, "src/**/*.test-d.ts"),
        join(sourceRoot, pkg.dir, "src/**/*.no.test.ts"),
        join(sourceRoot, pkg.dir, "tests/**"),
      ],
    }, null, 2)}\n`);
    writeFileSync(typedocConfig, `${JSON.stringify({
      $schema: "https://typedoc.org/schema.json",
      entryPoints: [
        join(sourceRoot, pkg.dir, "src/index.ts"),
        ...(pkg.docsEntryPoints ?? []).map(entryPoint => join(sourceRoot, pkg.dir, entryPoint)),
      ],
      entryPointStrategy: "resolve",
      excludeInternal: true,
      ...(pkg.slug === "arcscord" ? arcscordTypedocOptions : {}),
      ...(pkg.slug === "components" ? componentsTypedocOptions : {}),
      ...(pkg.slug === "error" ? errorTypedocOptions : {}),
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

  const availableVersions = existsSync(outDir)
    ? readdirSync(outDir)
        .filter(file => file.endsWith(".json"))
        .map(file => file.slice(0, -".json".length))
    : [];
  const { defaultVersion, latest, versions } = resolveApiDocVersions(availableVersions);
  const files = Object.fromEntries(
    versions.map(fileVersion => [fileVersion, `/api/${pkg.slug}/${fileVersion}.json`]),
  );

  manifest.packages[pkg.slug] = {
    name: packageJson.name,
    description: packageJson.description ?? "",
    currentVersion: packageJson.version,
    latest,
    defaultVersion,
    versions,
    files,
  };
}

writeFileSync(join(apiRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
