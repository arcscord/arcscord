import { createTsupConfig } from "../../scripts/tsup.config.js";

export default createTsupConfig({
  cjsOptions: {
    entry: ["src/index.ts", "src/testing/index.ts"],
    splitting: false,
  },
  esmOptions: {
    entry: ["src/index.ts", "src/testing/index.ts"],
    splitting: false,
  },
});
