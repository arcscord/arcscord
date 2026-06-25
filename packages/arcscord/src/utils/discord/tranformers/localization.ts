import type { TFunction } from "i18next";
import type { ArcClient } from "#/base";
import type { LocaleCallback } from "#/manager";
import type { LocaleMap } from "#/utils";

export function localizationCallbackToMap(
  locales: LocaleCallback,
  client: ArcClient,
): LocaleMap {
  const localeMap: LocaleMap = {};

  for (const locale of client.localeManager.availableLanguages) {
    const lang = client.localeManager.mapLanguage(locale);
    if (!hasResourceBundle(client, lang)) {
      continue;
    }

    const t = client.localeManager.i18n.getFixedT(lang) as TFunction;
    localeMap[locale] = locales(t);
  }

  return localeMap;
}

function hasResourceBundle(client: ArcClient, lang: string): boolean {
  if (!client.localeManager.i18n.hasResourceBundle) {
    return true;
  }

  const namespaces = getNamespaces(client);
  if (namespaces.length === 0) {
    return true;
  }

  return namespaces.some((namespace) => {
    return client.localeManager.i18n.hasResourceBundle(lang, namespace);
  });
}

function getNamespaces(client: ArcClient): string[] {
  const { defaultNS, ns } = client.localeManager.i18n.options ?? {};
  const namespaces = normalizeNamespaces(defaultNS) ?? normalizeNamespaces(ns);

  if (!namespaces) {
    return [];
  }

  return namespaces;
}

function normalizeNamespaces(namespaces: string | readonly string[] | false | undefined): string[] | undefined {
  if (!namespaces) {
    return undefined;
  }

  return typeof namespaces === "string" ? [namespaces] : [...namespaces];
}
