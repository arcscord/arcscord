import type { ESBuildOptions } from "vite";
import type { ViteUserConfig } from "vitest/config";
import { defaultExclude, defineConfig } from "vitest/config";

export function createVitestConfig(options: ViteUserConfig = {}) {
  return defineConfig({
    ...options,
    test: {
      ...options?.test,
      globals: true,
      exclude: [...defaultExclude, "**/dist/**", "**/*.no.test.*"],
    },
    esbuild: {
      ...options?.esbuild,
      target: (options?.esbuild as ESBuildOptions | undefined)?.target ?? "es2022",
    },
  });
}
