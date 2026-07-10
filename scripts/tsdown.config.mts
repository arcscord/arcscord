import type { UserConfig } from "tsdown";
import { defineConfig } from "tsdown";

const baseOptions: UserConfig = {
  clean: true,
  deps: { skipNodeModulesBundle: true },
  dts: true,
  entry: ["src/index.ts"],
  minify: false,
  platform: "node",
  sourcemap: true,
  target: "es2024",
  treeshake: true,
  tsconfig: "tsconfig.json",
};

export function createTsdownConfig(options?: EnhancedTsdownOptions): UserConfig[] {
  return [
    defineConfig({
      ...baseOptions,
      format: "cjs",
      outDir: "dist/cjs",
      outExtensions: () => ({ js: ".cjs", dts: ".d.ts" }),
      ...options?.cjsOptions,
    }) as UserConfig,
    defineConfig({
      ...baseOptions,
      format: "esm",
      outDir: "dist/esm",
      outExtensions: () => ({ js: ".mjs", dts: ".d.mts" }),
      ...options?.esmOptions,
    }) as UserConfig,
  ];
}

type EnhancedTsdownOptions = {
  cjsOptions?: UserConfig;
  esmOptions?: UserConfig;
};
