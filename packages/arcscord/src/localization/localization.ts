import type {
  CreateLocalizationAdapterOptions,
  LocalizationAdapter,
  LocalizationDefinition,
} from "./localization.type";

/** Creates a fully compliant Arcscord adapter around a locale-bound surface factory. */
export function createLocalizationAdapter<Surface>(
  options: CreateLocalizationAdapterOptions<Surface>,
): LocalizationAdapter<Surface> {
  const locales = options.locales instanceof Set ? options.locales : new Set(options.locales);
  const ready = Promise.resolve(options.ready).then(() => undefined);
  const adapter: LocalizationAdapter<Surface> = {
    defaultLocale: options.defaultLocale,
    locales,
    ready,
    localize: value => options.localize(typeof value === "string" ? value : value.locale),
  };

  return adapter;
}

/**
 * Creates an opaque Discord metadata localization owned by an adapter.
 *
 * Adapter packages should wrap this low-level helper with a provider-native,
 * typed `localizations` API.
 */
export function createLocalizationDefinition<Surface>(
  adapter: LocalizationAdapter<Surface>,
  resolve: (locale: string) => string,
): LocalizationDefinition {
  return {
    adapter: adapter as LocalizationAdapter<unknown>,
    resolve,
    type: "arcscord.localization",
  };
}

/** Returns whether a value is an Arcscord localization definition. */
export function isLocalizationDefinition(value: unknown): value is LocalizationDefinition {
  return typeof value === "object"
    && value !== null
    && "type" in value
    && value.type === "arcscord.localization"
    && "resolve" in value
    && typeof value.resolve === "function";
}
