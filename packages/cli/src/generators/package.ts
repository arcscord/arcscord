export type PackageJSONOptions = {
  name: string;
  eslint?: "eslint" | "antfu" | "arcscord" | false;
  prettier?: boolean;
  i18n?: boolean;
};

const dependenciesVersions = {
  "arcscord": "0.3.0-beta-7",
  "discord.js": "^14.16.3",
  "@swc-node/core": "^1.13.3",
  "@swc-node/register": "^1.10.9",
  "@types/node": "^20.16.13",
  "dotenv": "^16.4.5",
  "nodemon": "^3.1.7",
  "tsc-alias": "^1.8.10",
  "tsconfig-paths": "^4.2.0",
  "typescript": "^5.7.2",

  "eslint": "^9.17.0",
  "@eslint/js": "^9.17.0 ",
  "typescript-eslint": "^8.19.0",
  "@antfu/eslint-config": "^3.11.0",

  "prettier": "^3.4.2",
  "eslint-config-prettier": "^9.1.0",

  "i18next": "^23.16.4",
};

export function generatePackageJson(options: PackageJSONOptions): string {
  const jsonObj: Record<string, unknown> = {
    name: options.name,
    version: "1.0.0",
    description: "A discord bot made with arcscord",
    scripts: {
      start: "node -r @swc-node/register -r tsconfig-paths/register src/index.ts",
      dev: "npx nodemon --exec node --import=@swc-node/register/esm-register ./src/index.ts dev debug",
    },
    dependencies: {
      "arcscord": dependenciesVersions.arcscord,
      "discord.js": dependenciesVersions["discord.js"],
    },
    devDependencies: {
      "@swc-node/core": dependenciesVersions["@swc-node/core"],
      "@swc-node/register": dependenciesVersions["@swc-node/register"],
      "@types/node": dependenciesVersions["@types/node"],
      "dotenv": dependenciesVersions.dotenv,
      "nodemon": dependenciesVersions.nodemon,
      "tsc-alias": dependenciesVersions["tsc-alias"],
      "tsconfig-paths": dependenciesVersions["tsconfig-paths"],
      "typescript": dependenciesVersions.typescript,
    },
  };

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
