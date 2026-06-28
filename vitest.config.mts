import { createVitestConfig } from "./scripts/vitest.config.mjs";

export default createVitestConfig({
  esbuild: {
    target: "es2020",
  },
  resolve: {
    alias: {
      "#/": new URL("./packages/arcscord/src/", import.meta.url).pathname,
      "arcscord/testing": new URL("./packages/arcscord/src/testing/index.ts", import.meta.url).pathname,
      "arcscord": new URL("./packages/arcscord/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    projects: [
      "./packages/arcscord/",
      "./packages/better_error/",
      "./packages/error/",
      "./packages/middleware/",
    ],
  },
});
