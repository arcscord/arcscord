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
      "**/templates/**",
      ".local/*",
      "CLAUDE.md",
      "AGENTS.md",
      "**/generated/**",
      "examples/**",
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
  {
    files: ["packages/create-arcscord-bot/**"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["test/logger_demo/**"],
    rules: {
      "no-console": "off",
    },
  },
);
