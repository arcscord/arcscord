import { createVitestConfig } from "../../scripts/vitest.config.mjs";

export default createVitestConfig({
  test: {
    setupFiles: ["./src/testing/vitest.setup.ts"],
    typecheck: {
      enabled: true,
      tsconfig: "tsconfig.eslint.json",
    },
  },
  resolve: {
    alias: {
      "#/": new URL("./src/", import.meta.url).pathname,
    },
  },
});
