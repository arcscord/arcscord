/**
 * List of locales supported by discord api
 * @see [Discord Docs](https://discord.com/developers/docs/reference#locales=
 */
export type Locale
  = "id"
    | "da"
    | "de"
    | "en-GB"
    | "en-US"
    | "es-ES"
    | "es-419"
    | "fr"
    | "hr"
    | "it"
    | "lt"
    | "hu"
    | "nl"
    | "no"
    | "pl"
    | "pt-BR"
    | "ro"
    | "fi"
    | "sv-SE"
    | "vi"
    | "tr"
    | "cs"
    | "el"
    | "bg"
    | "ru"
    | "uk"
    | "hi"
    | "th"
    | "zh-CN"
    | "ja"
    | "zh-TW"
    | "ko";

export const supportedDiscordLocales: readonly Locale[] = [
  "id",
  "da",
  "de",
  "en-GB",
  "en-US",
  "es-ES",
  "es-419",
  "fr",
  "hr",
  "it",
  "lt",
  "hu",
  "nl",
  "no",
  "pl",
  "pt-BR",
  "ro",
  "fi",
  "sv-SE",
  "vi",
  "tr",
  "cs",
  "el",
  "bg",
  "ru",
  "uk",
  "hi",
  "th",
  "zh-CN",
  "ja",
  "zh-TW",
  "ko",
];

export const supportedDiscordLocaleSet: ReadonlySet<string> = new Set(supportedDiscordLocales);

export function isDiscordLocale(locale: string): locale is Locale {
  return supportedDiscordLocaleSet.has(locale);
}

/**
 * Represent a object for discord localization
 */
export type LocaleMap = Partial<Record<Locale, string>>;
