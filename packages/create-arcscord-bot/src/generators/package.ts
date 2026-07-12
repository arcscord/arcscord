import type { PackageManagerType } from "../types.js";
import { ARCSCORD_VERSION_RANGE } from "../arcscord-version.js";

export const MINIMUM_NODE_VERSION = ">=24.11.0";
export const MINIMUM_BUN_VERSION = ">=1.3.0";

export type PackageJSONOptions = {
  name: string;
  packageManager: PackageManagerType;
  eslint?: "eslint" | "antfu" | "arcscord" | false;
  prettier?: boolean;
  i18n?: boolean;
};

const dependenciesVersions = {
  "discord.js": "^14.26.4",
  "@types/node": "^24.10.0",
  "tsx": "^4.23.0",
  "typescript": "^6.0.3",

  "eslint": "^10.6.0",
  "@eslint/js": "^10.0.1",
  "typescript-eslint": "^8.62.0",
  "@antfu/eslint-config": "^9.1.0",

  "prettier": "^3.9.1",
  "eslint-config-prettier": "^10.1.8",

  "i18next": "^26.3.3",
};

export function generatePackageJson(options: PackageJSONOptions): string {
  const isBun = options.packageManager === "bun";

  // `.env` is loaded by the runtime, not the code (no `dotenv` dependency):
  // - Bun loads `.env` automatically.
  // - Node uses the native `--env-file-if-exists` flag (loads `.env` when present,
  //   falls back to the ambient environment otherwise, e.g. Docker/prod).
  const scripts: Record<string, string> = isBun
    ? {
        start: "bun src/index.ts",
        dev: "bun src/index.ts dev debug",
        typecheck: "tsc --noEmit",
      }
    : {
        start: "node --import=tsx --env-file-if-exists=.env src/index.ts",
        dev: "node --import=tsx --env-file-if-exists=.env src/index.ts dev debug",
        typecheck: "tsc --noEmit",
      };

  const devDependencies: Record<string, string> = isBun
    ? {
        "@types/node": dependenciesVersions["@types/node"],
        "typescript": dependenciesVersions.typescript,
      }
    : {
        "@types/node": dependenciesVersions["@types/node"],
        "tsx": dependenciesVersions.tsx,
        "typescript": dependenciesVersions.typescript,
      };

  const jsonObj: Record<string, unknown> = {
    name: options.name,
    version: "1.0.0",
    description: "A discord bot made with arcscord",
    scripts,
    dependencies: {
      "arcscord": ARCSCORD_VERSION_RANGE,
      "discord.js": dependenciesVersions["discord.js"],
    },
    devDependencies,
    engines: isBun ? { bun: MINIMUM_BUN_VERSION } : { node: MINIMUM_NODE_VERSION },
  };

  if (options.packageManager === "pnpm") {
    jsonObj.pnpm = { onlyBuiltDependencies: ["esbuild"] };
  }

  if (options.eslint) {
    (jsonObj.scripts as Record<string, string>).lint = "eslint .";
    (jsonObj.scripts as Record<string, string>)["lint:fix"] = "eslint --fix .";
    (jsonObj.devDependencies as Record<string, string>).eslint = dependenciesVersions.eslint;
    if (options.eslint === "eslint") {
      (jsonObj.devDependencies as Record<string, string>)["@eslint/js"] = dependenciesVersions["@eslint/js"];
      (jsonObj.devDependencies as Record<string, string>)["typescript-eslint"] = dependenciesVersions["typescript-eslint"];
    }
    else {
      (jsonObj.devDependencies as Record<string, string>)["@antfu/eslint-config"] = dependenciesVersions["@antfu/eslint-config"];
    }
  }

  if (options.prettier) {
    (jsonObj.scripts as Record<string, string>).prettier = "prettier --write .";
    (jsonObj.devDependencies as Record<string, string>).prettier = dependenciesVersions.prettier;
    if (options.eslint) {
      (jsonObj.devDependencies as Record<string, string>)["eslint-config-prettier"] = dependenciesVersions["eslint-config-prettier"];
    }
  }

  if (options.i18n) {
    (jsonObj.dependencies as Record<string, string>).i18next = dependenciesVersions.i18next;
  }

  return JSON.stringify(jsonObj, null, 2);
}
