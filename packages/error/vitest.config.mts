import { createVitestConfig } from "../../scripts/config/vitest.mts";

export default createVitestConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: "tsconfig.eslint.json",
    },
  },
});
