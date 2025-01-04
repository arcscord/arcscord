import { createVitestConfig } from "../../scripts/vitest.config.mjs";

export default createVitestConfig({
  resolve: {
    mainFields: ["module"],
  },
  test: {
    deps: {
      optimizer: {
        web: {
          enabled: true,
          // second one just to make tests faster
          include: ["bpmn-js-properties-panel", "bpmn-js/lib/Modeler"],
        },
      },
    },
  },
});
