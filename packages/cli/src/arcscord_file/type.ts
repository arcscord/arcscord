import type { Result } from "@arcscord/error";

export type ArcscordFileParser = {
  version: number;
  parse: (data: unknown) => Result<ArcscordFileData, Error> | Promise<Result<ArcscordFileData, Error>>;
};

export type ArcscordFileData = {
  commands: ArcscordFileElement[];
  events: ArcscordFileElement[];
  components: ArcscordFileElement[];
  tasks: ArcscordFileElement[];
  packageManager: PackageManagerOptions;
  options: Options[];
};

export type ArcscordFileElement = {
  name: string;
  path: string;
};

export type PackageManagerOptions = {
  type: PackageManagerType;
};

export type PackageManagerType = "npm" | "yarn" | "pnpm";

export type Options = "i18n" | "eslint" | "prettier";
