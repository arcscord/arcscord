import type { ArcClient } from "#/base";
import type { LocaleManager } from "#/manager/locale/locale_manager.class";
import type { Locale } from "#/utils";
import type {
  LocaleDetectionContext,
  LocaleDetector,
  LocalizationDefinition,
  LocalizationOptions,
} from "./localization.type";
import { anyToError } from "@arcscord/error";
import { supportedDiscordLocales } from "#/utils";
import { LocalizationReadyTimeoutError } from "#/utils/error/class/localization_ready_timeout_error";

/** Default adapter initialization timeout in milliseconds. */
export const defaultLocalizationReadyTimeout = 30_000;

/** Default mapping between provider language keys and Discord locales. */
export const defaultLanguageMap: Readonly<Record<string, Locale | Locale[]>> = {
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

/** Default locale detector used by modern and legacy localization. */
export const defaultLocaleDetector: LocaleDetector = (context) => {
  return context.interaction?.locale || context.guild?.preferredLocale;
};

/** Coordinates locale detection and Discord metadata localization for a client. */
export class LocalizationService {
  readonly enabled: boolean;
  readonly ready: Promise<void>;
  readonly adapter: LocalizationOptions["adapter"] | undefined;
  readonly discordLocales: ReadonlySet<Locale>;

  private readonly client: ArcClient;
  private readonly detector: LocaleDetector;
  private readonly reverseLanguageMap: ReadonlyMap<string, string>;
  private readonly legacyManager: LocaleManager;
  private readonly readyTimeout: number | false;

  constructor(client: ArcClient, options: LocalizationOptions | undefined, legacyManager: LocaleManager) {
    this.client = client;
    this.legacyManager = legacyManager;
    this.adapter = options?.adapter;
    this.enabled = Boolean(options) || legacyManager.enabled;
    this.ready = options?.adapter.ready ?? legacyManager.ready;
    this.readyTimeout = options?.readyTimeout ?? defaultLocalizationReadyTimeout;
    if (this.readyTimeout !== false && (!Number.isFinite(this.readyTimeout) || this.readyTimeout < 0)) {
      throw new RangeError("localization.readyTimeout must be a finite, non-negative number or false");
    }
    this.detector = options?.localeDetector ?? defaultLocaleDetector;
    this.discordLocales = new Set(options?.discordLocales ?? supportedDiscordLocales);
    const languageMap: Record<string, Locale | Locale[]> = { ...defaultLanguageMap };
    for (const [language, locales] of Object.entries(options?.languageMap ?? {})) {
      if (locales) {
        languageMap[language] = locales;
      }
    }
    this.reverseLanguageMap = this.buildReverseLanguageMap(languageMap);
  }

  /** Maps a Discord locale to the configured provider language key. */
  mapLanguage(locale: string): string {
    if (!this.adapter) {
      return this.legacyManager.mapLanguage(locale);
    }
    return this.reverseLanguageMap.get(locale) ?? locale;
  }

  /** Waits for adapter initialization, applying the configured timeout. */
  waitReady(): Promise<void> {
    if (!this.adapter || this.readyTimeout === false) {
      return this.ready;
    }
    return this.withReadyTimeout(this.ready, this.readyTimeout);
  }

  /** Detects and maps the provider locale for an interaction. */
  async detectLanguage(context: LocaleDetectionContext): Promise<string> {
    if (!this.adapter) {
      return this.legacyManager.detectLanguage(context);
    }

    try {
      await this.ready;
      const detected = await this.detector(context);
      const mapped = this.mapLanguage(detected ?? this.adapter.defaultLocale);
      return this.adapter.locales.has(mapped) ? mapped : this.adapter.defaultLocale;
    }
    catch (cause) {
      this.client.logger.warn(`Failed to detect language: ${anyToError(cause).message}`);
      return this.adapter.defaultLocale;
    }
  }

  /** Resolves a lazy localization into a Discord locale map. */
  resolveLocalizations(definition: LocalizationDefinition): Partial<Record<Locale, string>> {
    if (!this.adapter) {
      throw new Error("Localization definitions require ArcClientOptions.localization.adapter");
    }
    if (definition.adapter !== this.adapter) {
      throw new Error("Localization definition was created by a different adapter instance");
    }

    const result: Partial<Record<Locale, string>> = {};
    for (const discordLocale of this.discordLocales) {
      const providerLocale = this.mapLanguage(discordLocale);
      if (this.adapter.locales.has(providerLocale)) {
        result[discordLocale] = definition.resolve(providerLocale);
      }
    }
    return result;
  }

  private buildReverseLanguageMap(languageMap: Readonly<Record<string, Locale | Locale[]>>): ReadonlyMap<string, string> {
    const reverse = new Map<string, string>();
    for (const [language, locales] of Object.entries(languageMap)) {
      for (const locale of Array.isArray(locales) ? locales : [locales]) {
        reverse.set(locale, language);
      }
    }
    return reverse;
  }

  private withReadyTimeout(ready: Promise<void>, timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new LocalizationReadyTimeoutError(timeout));
      }, timeout);

      ready.then(
        () => {
          clearTimeout(timer);
          resolve();
        },
        (cause: unknown) => {
          clearTimeout(timer);
          reject(cause);
        },
      );
    });
  }
}
