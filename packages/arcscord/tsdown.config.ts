import { createTsdownConfig } from "../../scripts/tsdown.config.ts";

export default createTsdownConfig({
  cjsOptions: {
    entry: ["src/index.ts", "src/testing/index.ts"],
  },
  esmOptions: {
    entry: ["src/index.ts", "src/testing/index.ts"],
  },
});
