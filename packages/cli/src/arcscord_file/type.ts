import type { Result } from "@arcscord/error";

export type ArcscordFileParser = {
  version: number;
  parse: (data: unknown) => Result<ArcscordFileData, Error> | Promise<Result<ArcscordFileData, Error>>;
};

export type ArcscordFileData = {
  packageManager: PackageManagerOptions;
  options: Options[];
  version: number;
};

export type PackageManagerOptions = {
  type: PackageManagerType;
};

export type PackageManagerType = "npm" | "yarn" | "pnpm";

export type Options = "i18n" | "eslint" | "prettier";
