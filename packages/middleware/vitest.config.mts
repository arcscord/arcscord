import { createVitestConfig } from "../../scripts/vitest.config.mts";

export default createVitestConfig({
  resolve: {
    alias: {
      "#/": new URL("../arcscord/src/", import.meta.url).pathname,
      "arcscord/testing": new URL("../arcscord/src/testing/index.ts", import.meta.url).pathname,
      "arcscord": new URL("../arcscord/src/index.ts", import.meta.url).pathname,
    },
  },
});
