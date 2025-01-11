import type { ArcscordFileData } from "../arcscord_file/type";

export function replaceI18nVariables(baseString: string, patterns: Record<string, string>): string {
  for (const [key, value] of Object.entries(patterns)) {
    if (key === "path") {
      const pathPatternMatch = baseString.match(/\{\{path(.)\}\}/);
      if (pathPatternMatch) {
        const separator = pathPatternMatch[1];
        const pathAlias = value ? value.replace(/\//g, separator) + separator : "";
        baseString = baseString.replace(new RegExp(`\\{\\{path${separator}\\}\\}`, "g"), pathAlias);
      }
      continue;
    }
    baseString = baseString.replaceAll(`{{${key}}}`, value);
  }
  return baseString;
}

export function getCommandNameI18nPath(options: ArcscordFileData, variables: {
  name: string;
  path: string;
}): string {
  return replaceI18nVariables(
    options.i18n?.defaultCommandNamePattern ?? "commands.{{path.}}{{name}}.name",
    variables,
  );
};

export function getCommandDescriptionI18nPath(options: ArcscordFileData, variables: {
  name: string;
  path: string;
}): string {
  return replaceI18nVariables(
    options.i18n?.defaultCommandDescriptionPattern ?? "commands.{{path.}}{{name}}.description",
    variables,
  );
};

export function getSubCommandNameI18nPath(options: ArcscordFileData, variables: {
  name: string;
  path: string;
  subName: string;
}): string {
  return replaceI18nVariables(
    options.i18n?.defaultSubCommandNamePattern ?? "commands.{{path.}}{{name}}.{{subName}}.name",
    variables,
  );
}

export function getSubCommandDescriptionI18nPath(options: ArcscordFileData, variables: {
  name: string;
  path: string;
  subName: string;
}): string {
  return replaceI18nVariables(
    options.i18n?.defaultSubCommandDescriptionPattern ?? "commands.{{path.}}{{name}}.{{subName}}.description",
    variables,
  );
}

export function getSubCommandWithGroupNameI18nPath(options: ArcscordFileData, variables: {
  name: string;
  path: string;
  subName: string;
  groupName: string;
}): string {
  return replaceI18nVariables(
    options.i18n?.defaultSubCommandWithGroupNamePattern ?? "commands.{{path.}}{{name}}.{{groupName}}.{{subName}}.name",
    variables,
  );
}

export function getSubCommandWithGroupDescriptionI18nPath(options: ArcscordFileData, variables: {
  name: string;
  path: string;
  subName: string;
  groupName: string;
}): string {
  return replaceI18nVariables(
    options.i18n?.defaultSubCommandWithGroupDescriptionPattern ?? "commands.{{path.}}{{name}}.{{groupName}}.{{subName}}.description",
    variables,
  );
}

export function getSubCommandGroupNameI18nPath(options: ArcscordFileData, variables: {
  name: string;
  path: string;
  groupName: string;
}): string {
  return replaceI18nVariables(
    options.i18n?.defaultSubCommandGroupNamePattern ?? "commands.{{path.}}{{name}}.{{groupName}}.name",
    variables,
  );
}

export function getSubCommandGroupDescriptionI18nPath(options: ArcscordFileData, variables: {
  name: string;
  path: string;
  groupName: string;
}): string {
  return replaceI18nVariables(
    options.i18n?.defaultSubCommandGroupDescriptionPattern ?? "commands.{{path.}}{{name}}.{{groupName}}.description",
    variables,
  );
}
