import antfu from "@antfu/eslint-config";

export default antfu(
  {
    type: "lib",
    stylistic: {
      quotes: "double",
      semi: true,
    },
    typescript: true,
    ignores: [
      "docs/*",
      "json_docs/*",
      ".vscode/settings.json",
      "packages/cli/templates/**",
    ],
  },
  {
    rules: {
      "ts/consistent-type-definitions": ["error", "type"],
      "jsonc/sort-keys": "off",
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      "no-throw-literal": "off",
      "prefer-promise-reject-errors": "off",
    },
  },
  {
    files: ["packages/cli/**/*.ts"],
    rules: {
      "import/extensions": ["error", "ignorePackages"],
    },
  },
);
