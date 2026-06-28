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
      "website/docs/*",
      "json_docs/*",
      ".vscode/settings.json",
      "packages/cli/templates/**",
      ".local/*",
      "CLAUDE.md",
      "AGENTS.md",
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
    files: ["**/*.tsx"],
    rules: {
      "ts/explicit-function-return-type": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/_test/**/*.ts"],
    rules: {
      "ts/explicit-function-return-type": "off",
      "ts/no-explicit-any": "off",
      "ts/no-unsafe-assignment": "off",
      "ts/no-unsafe-call": "off",
      "ts/no-unsafe-member-access": "off",
      "ts/no-unsafe-argument": "off",
    },
  },
);
