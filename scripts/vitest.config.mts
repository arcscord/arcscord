import type { ViteUserConfig } from "vitest/config";
import { defaultExclude, defineConfig } from "vitest/config";

export function createVitestConfig(options: ViteUserConfig = {}) {
  const optionAlias = Array.isArray(options.resolve?.alias)
    ? {}
    : options.resolve?.alias;

  return defineConfig({
    ...options,
    resolve: {
      tsconfigPaths: true,
      ...options.resolve,
      alias: {
        "@arcscord/better-error": new URL("../packages/better_error/src/index.ts", import.meta.url).pathname,
        "@arcscord/components": new URL("../packages/components/src/index.ts", import.meta.url).pathname,
        "@arcscord/error": new URL("../packages/error/src/index.ts", import.meta.url).pathname,
        ...optionAlias,
      },
    },
    test: {
      ...options?.test,
      globals: true,
      exclude: [...defaultExclude, "**/dist/**", "**/*.no.test.*"],
    },
    oxc: {
      target: "es2022",
      ...options?.oxc,
    },
  });
}
