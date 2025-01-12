import type { ArcscordFileData } from "../arcscord_file/type";
import { getCommandDescriptionI18nPath, getCommandNameI18nPath, getSubCommandDescriptionI18nPath, getSubCommandNameI18nPath, getSubCommandWithGroupDescriptionI18nPath, getSubCommandWithGroupNameI18nPath } from "../utils/i18n.js";

export function initializeSubCommandDefFile(content: string, name: string, path: string, options: ArcscordFileData): string {
  content = content.replaceAll("{{name}}", name);
  content = content.replaceAll("{{i18nName}}", getCommandNameI18nPath(options, {
    name,
    path,
  }));
  content = content.replaceAll("{{i18nDescription}}", getCommandDescriptionI18nPath(options, {
    name,
    path,
  }));
  return content;
}

export function initializeSubCommandFile(content: string, variables: {
  name: string;
  path: string;
  groupName: string | undefined;
  subName: string;
}, options: ArcscordFileData): string {
  content = content.replaceAll("{{name}}", variables.subName);

  if (variables.groupName) {
    content = content.replaceAll("{{i18nName}}", getSubCommandWithGroupNameI18nPath(options, {
      name: variables.name,
      path: variables.path,
      subName: variables.subName,
      groupName: variables.groupName,
    }));

    content = content.replaceAll("{{i18nDescription}}", getSubCommandWithGroupDescriptionI18nPath(options, {
      name: variables.name,
      path: variables.path,
      subName: variables.subName,
      groupName: variables.groupName,
    }));
    return content;
  }

  content = content.replaceAll("{{i18nName}}", getSubCommandNameI18nPath(options, {
    name: variables.name,
    path: variables.path,
    subName: variables.subName,
  }));

  content = content.replaceAll("{{i18nDescription}}", getSubCommandDescriptionI18nPath(options, {
    name: variables.name,
    path: variables.path,
    subName: variables.subName,
  }));
  return content;
}

export function initializeCommandFile(content: string, name: string, path: string, options: ArcscordFileData): string {
  content = content.replaceAll("{{name}}", name);
  content = content.replaceAll("{{i18nName}}", getCommandNameI18nPath(options, {
    name,
    path,
  }));
  content = content.replaceAll("{{i18nDescription}}", getCommandDescriptionI18nPath(options, {
    name,
    path,
  }));
  return content;
}
