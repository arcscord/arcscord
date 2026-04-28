import { createVitestConfig } from "./scripts/vitest.config.mjs";

export default createVitestConfig({
  esbuild: {
    target: "es2020",
  },
  resolve: {
    alias: {
      "#/": new URL("./packages/arcscord/src/", import.meta.url).pathname,
    },
  },
});
