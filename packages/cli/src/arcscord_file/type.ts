import type { Result } from "@arcscord/error";

export type ArcscordFileParser = {
  version: number;
  parse: (data: unknown) => Result<ArcscordFileData, Error> | Promise<Result<ArcscordFileData, Error>>;
};

export type ArcscordFileData = {
  packageManager: PackageManagerOptions;
  options: Options[];
  version: number;
  basePaths: BasePaths;
  i18n?: I18nOptions;
  customExtension?: string;
};

export type PackageManagerOptions = {
  type: PackageManagerType;
};

export type BasePaths = {
  root: string;
  commands: string;
  events: string;
  components: string;
  tasks: string;
  handlerList: string;
};

export type I18nOptions = {
  defaultCommandNamePattern?: string;
  defaultCommandDescriptionPattern?: string;
  defaultSubCommandNamePattern?: string;
  defaultSubCommandDescriptionPattern?: string;
  defaultSubCommandGroupNamePattern?: string;
  defaultSubCommandGroupDescriptionPattern?: string;
  defaultSubCommandWithGroupNamePattern?: string;
  defaultSubCommandWithGroupDescriptionPattern?: string;
};

export type PackageManagerType = "npm" | "yarn" | "pnpm";

export type Options = "i18n" | "eslint" | "prettier";
