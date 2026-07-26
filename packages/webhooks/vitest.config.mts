import { createVitestConfig } from "../../scripts/vitest.config.mts";

export default createVitestConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: "tsconfig.eslint.json",
    },
  },
});
