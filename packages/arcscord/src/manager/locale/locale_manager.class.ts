import type { i18n } from "i18next";
import type { ArcClient } from "#/base";
import type {
  BaseLocaleManagerOptions,
  LangDetector,
  LocaleManagerOptions,
  NormalizedLocaleManagerOptions,
} from "#/manager/locale/locale_manager.type";
import type { Locale } from "#/utils";
import { anyToError } from "@arcscord/error";
import i18next from "i18next";
import { BaseManager } from "#/base";
import { supportedDiscordLocales } from "#/utils";

/**
 * Manages localization for the application.
 *
 * The LocaleManager handles language detection, initialization of the i18next library,
 * and management of language resources and mappings.
 */
export class LocaleManager extends BaseManager {
  /**
   * A set containing Locale keys
   */
  static readonly localeSet: Set<Locale> = new Set(supportedDiscordLocales);

  /**
   * Default language map defining the supported locales.
   * Maps language codes to either a single locale or an array of locales.
   */
  static readonly defaultLanguageMap: Record<string, Locale | Locale[]> = {
    "id": "id",
    "da": "da",
    "de": "de",
    "en": ["en-GB", "en-US"],
    "es": ["es-ES", "es-419"],
    "fr": "fr",
    "hr": "hr",
    "it": "it",
    "lt": "lt",
    "hu": "hu",
    "nl": "nl",
    "no": "no",
    "pl": "pl",
    "pt": "pt-BR",
    "ro": "ro",
    "fi": "fi",
    "sv": "sv-SE",
    "vi": "vi",
    "tr": "tr",
    "cs": "cs",
    "el": "el",
    "bg": "bg",
    "ru": "ru",
    "uk": "uk",
    "hi": "hi",
    "th": "th",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    "ja": "ja",
    "ko": "ko",
  };

  /**
   * Default language detection function.
   * Determines the language based on interaction or guild context.
   */
  static defaultLangDetector: LangDetector = (options) => {
    return options.interaction?.locale || options.guild?.preferredLocale;
  };

  /**
   * Default options for the LocaleManager.
   * Combines custom i18n instance settings, language map, i18n initialization options,
   * and language detection function.
   */
  static defaultOptions: Partial<BaseLocaleManagerOptions> = {
    languageMap: LocaleManager.defaultLanguageMap,
    langDetector: LocaleManager.defaultLangDetector,
    availableLanguages: LocaleManager.localeSet,
  };

  /**
   * Enable or disable the locale manager
   */
  readonly enabled: boolean;

  /**
   * The options used by the LocaleManager.
   */
  readonly options: LocaleManagerOptions;

  /**
   * Options after applying Arcscord defaults.
   */
  readonly normalizedOptions: NormalizedLocaleManagerOptions;

  /**
   * The i18n instance used for localization.
   */
  i18n: i18n;

  /**
   * The translation function provided by i18next.
   * alias of the manager i18n instance `t` function.
   */
  t: typeof i18next.t;

  /**
   * An instance of the LangDetector class responsible for language detection.
   */
  readonly detect: LangDetector;

  readonly availableLanguages: Set<Locale>;

  /**
   * Reverse index of {@link NormalizedLocaleManagerOptions.languageMap}, mapping
   * each locale back to its language key so {@link mapLanguage} is O(1).
   *
   * @internal
   */
  private readonly reverseLanguageMap: Map<string, string>;

  /**
   * Resolves when the i18next instance is ready to serve translations.
   */
  readonly ready: Promise<void>;

  /**
   * Constructs a new instance of the LocaleManager.
   *
   * @param client - The ArcClient instance.
   * @param options - Options to configure the LocaleManager.
   */
  constructor(client: ArcClient, options: LocaleManagerOptions = { enabled: false }) {
    super(client, "locale");

    this.options = options;
    this.enabled = options.enabled ?? false;
    this.normalizedOptions = this.normalizeOptions(options);
    this.reverseLanguageMap = LocaleManager.buildReverseLanguageMap(this.normalizedOptions.languageMap);
    this.i18n = i18next.createInstance();

    if (!options.enabled) {
      this.i18n = i18next.createInstance();
      this.t = this.i18n.t;
      this.detect = LocaleManager.defaultLangDetector;
      this.availableLanguages = new Set(LocaleManager.localeSet);
      this.ready = Promise.resolve();
      return;
    }
    else if ("customI18n" in options && options.customI18n) {
      this.i18n = options.customI18n;
      this.ready = Promise.resolve();
    }
    else {
      this.i18n = i18next.createInstance();
      const init = this.i18n.init(options.i18nOptions).then(() => undefined);
      // `ready` stays rejectable for anyone awaiting it. This side branch only
      // marks the rejection as observed, so a failing init logs instead of
      // reaching the process as an unhandledRejection before the first
      // `await this.ready` in detectLanguage().
      init.catch(err => this.logger.logError(err, { source: "localeManager.init" }));
      this.ready = init;
    }
    this.t = this.i18n.t;

    this.detect = this.normalizedOptions.langDetector;
    this.availableLanguages = this.normalizedOptions.availableLanguages;
  }

  /**
   * Builds the locale -> language key index used by {@link mapLanguage}.
   *
   * The first key declaring a locale wins, matching the previous linear scan
   * over `Object.entries(languageMap)`.
   *
   * @internal
   */
  private static buildReverseLanguageMap(languageMap: Record<string, Locale | Locale[]>): Map<string, string> {
    const reverse = new Map<string, string>();

    for (const [key, value] of Object.entries(languageMap)) {
      for (const locale of Array.isArray(value) ? value : [value]) {
        if (!reverse.has(locale)) {
          reverse.set(locale, key);
        }
      }
    }

    return reverse;
  }

  private normalizeOptions(options: LocaleManagerOptions): NormalizedLocaleManagerOptions {
    if (!options.enabled) {
      return {
        enabled: true,
        languageMap: LocaleManager.defaultLanguageMap,
        langDetector: LocaleManager.defaultLangDetector,
        availableLanguages: new Set(LocaleManager.localeSet),
      };
    }

    const languageMap: Record<string, Locale | Locale[]> = {
      ...LocaleManager.defaultLanguageMap,
    };
    for (const [language, locales] of Object.entries(options.languageMap ?? {})) {
      if (locales) {
        languageMap[language] = locales;
      }
    }

    return {
      ...options,
      languageMap,
      langDetector: options.langDetector ?? LocaleManager.defaultLangDetector,
      availableLanguages: options.availableLanguages instanceof Set
        ? new Set(options.availableLanguages)
        : new Set(options.availableLanguages ?? LocaleManager.localeSet),
    };
  }

  /**
   * @internal
   */
  private defaultLanguage(): string {
    if (typeof this.i18n.options.fallbackLng === "string") {
      return this.i18n.options.fallbackLng;
    }
    if (Array.isArray(this.i18n.options.fallbackLng)) {
      return this.i18n.options.fallbackLng[0] || "en";
    }
    return "en";
  }

  /**
   * Maps the detected language to a key based on the defined languageMap.
   *
   * For example for transform a discord lang key to a locale lang key
   *
   * @param lang - The detected language.
   * @returns The mapped language key.
   */
  mapLanguage(lang: string): string {
    if (!this.options.enabled) {
      return lang;
    }

    return this.reverseLanguageMap.get(lang) ?? lang;
  }

  /**
   * Detects the language based on the provided options.
   *
   * @param options - The options for language detection.
   * @returns The detected language key.
   */
  async detectLanguage(options: Parameters<LangDetector>[0]): Promise<string> {
    try {
      await this.ready;
      const lang = await this.detect(options);
      return this.mapLanguage(lang || this.defaultLanguage());
    }
    catch (e) {
      this.logger.warn(`Failed to detect language, a throw happens, error : ${anyToError(e).message}`);
      return this.defaultLanguage();
    }
  }
}
