import type { LocalizationAdapter, LocalizationDefinition } from "arcscord";
import type { i18n, InitOptions, SelectorParam, TFunction, TOptions, TypeOptions } from "i18next";
import { createLocalizationAdapter, createLocalizationDefinition } from "arcscord";
import i18next from "i18next";

/** Options shared by both i18next adapter initialization modes. */
export type BaseI18nextAdapterOptions = {
  /** Explicit fallback when it cannot be inferred from i18next. */
  defaultLocale?: string;
  /** Provider locales considered for Discord command metadata. */
  locales?: Iterable<string>;
};

/** Configuration for {@link createI18nextAdapter}. */
export type I18nextAdapterOptions = BaseI18nextAdapterOptions & (
  | {
    /** Already initialized i18next instance. */
    instance: i18n;
    options?: never;
  }
  | {
    /** Options used to initialize an isolated i18next instance. */
    instance?: never;
    options: InitOptions;
  }
);

/** Builds Discord metadata using i18next's native key or selector syntax. */
export type I18nextLocalizationBuilder = TypeOptions["enableSelector"] extends false
  ? (key: string | string[], options?: TOptions) => LocalizationDefinition
  : (selector: SelectorParam, options?: TOptions) => LocalizationDefinition;

/** i18next adapter with access to its underlying instance and Discord metadata builder. */
export type I18nextAdapter = LocalizationAdapter<TFunction> & {
  readonly i18n: i18n;
  /** Creates a lazy Discord localization using a native i18next selector or key. */
  readonly discord: I18nextLocalizationBuilder;
};

/** Creates an isolated or custom-instance i18next adapter for Arcscord. */
export function createI18nextAdapter(options: I18nextAdapterOptions): I18nextAdapter {
  const instance = options.instance ?? i18next.createInstance();
  const localeSet = new Set<string>();
  const ready = options.instance
    ? Promise.resolve()
    : instance.init(options.options).then(() => undefined);

  const candidates = (): Iterable<string> => {
    if (options.locales) {
      return options.locales;
    }

    const supported = instance.options.supportedLngs;
    if (supported) {
      return supported.filter(locale => locale !== "cimode");
    }

    return Object.keys(instance.store?.data ?? options.options?.resources ?? {});
  };

  const initialized = ready.then(() => {
    for (const locale of candidates()) {
      if (hasTranslationResources(instance, locale)) {
        localeSet.add(locale);
      }
    }
  });

  const adapter = createLocalizationAdapter<TFunction>({
    defaultLocale: options.defaultLocale ?? resolveFallbackLocale(instance, options.options),
    locales: localeSet,
    ready: initialized,
    getFixed: locale => instance.getFixedT(locale),
  });
  const discord = ((key: SelectorParam | string | string[], translationOptions?: TOptions) => {
    return createLocalizationDefinition(adapter, (locale) => {
      const translate = instance.getFixedT(locale) as (
        key: SelectorParam | string | string[],
        options?: TOptions,
      ) => unknown;
      const result = translate(key, translationOptions);
      if (typeof result !== "string") {
        throw new TypeError("i18next command metadata translations must resolve to a string");
      }
      return result;
    });
  }) as I18nextLocalizationBuilder;

  return Object.assign(adapter, {
    discord,
    i18n: instance,
  });
}

function resolveFallbackLocale(instance: i18n, options: InitOptions | undefined): string {
  const fallback = instance.options.fallbackLng ?? options?.fallbackLng;
  if (typeof fallback === "string") {
    return fallback;
  }
  if (Array.isArray(fallback)) {
    return fallback[0] ?? "en";
  }
  return "en";
}

function hasTranslationResources(instance: i18n, locale: string): boolean {
  const namespaces = normalizeNamespaces(instance.options.defaultNS)
    ?? normalizeNamespaces(instance.options.ns);
  if (!namespaces || namespaces.length === 0) {
    return true;
  }
  return namespaces.some(namespace => instance.hasResourceBundle(locale, namespace));
}

function normalizeNamespaces(value: string | readonly string[] | false | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  return typeof value === "string" ? [value] : [...value];
}
