import { createTsdownConfig } from "../../scripts/config/tsdown.mts";

export default createTsdownConfig({
  cjsOptions: {
    entry: ["src/index.ts", "src/testing/index.ts"],
  },
  esmOptions: {
    entry: ["src/index.ts", "src/testing/index.ts"],
  },
});
