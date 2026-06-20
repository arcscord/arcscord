import { createVitestConfig } from "../../scripts/vitest.config.mts";

export default createVitestConfig({
  resolve: {
    alias: {
      arcscord: new URL("../arcscord/src/index.ts", import.meta.url).pathname,
    },
  },
});
