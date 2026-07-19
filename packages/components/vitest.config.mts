import { createVitestConfig } from "../../scripts/vitest.config.mjs";

export default createVitestConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: "tsconfig.eslint.json",
    },
  },
});
