import { createVitestConfig } from "../../scripts/vitest.config.mjs";

export default createVitestConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: "tsconfig.json",
    },
  },
  resolve: {
    alias: {
      "#/": new URL("./src/", import.meta.url).pathname,
    },
  },
});
