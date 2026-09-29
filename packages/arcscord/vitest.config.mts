import { createVitestConfig } from "../../scripts/config/vitest.mts";

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
