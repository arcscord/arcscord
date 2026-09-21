import type { LocalizationAdapter } from "arcscord";
import { createLocalizationAdapter } from "arcscord";

/** Minimal structural shape of a generated Paraglide messages module. */
export type ParaglideMessages = Record<string, (...args: never[]) => string>;

/** Generated Paraglide runtime values required by the adapter. */
export type ParaglideRuntime = {
  readonly baseLocale: string;
  readonly locales: readonly string[];
};

/** Configuration for {@link createParaglideAdapter}. */
export type ParaglideAdapterOptions<Messages extends object> = {
  /** Generated `messages.js` exports. */
  messages: Messages;
  /** `baseLocale` and `locales` from generated `runtime.js`. */
  runtime: ParaglideRuntime;
};

/** Creates a Paraglide adapter without changing Paraglide's global locale. */
export function createParaglideAdapter<Messages extends object>(
  options: ParaglideAdapterOptions<Messages>,
): LocalizationAdapter<Messages> {
  const cache = new Map<string, Messages>();

  return createLocalizationAdapter<Messages>({
    defaultLocale: options.runtime.baseLocale,
    locales: options.runtime.locales,
    localize: (locale) => {
      const cached = cache.get(locale);
      if (cached) {
        return cached;
      }

      const localized = new Proxy(options.messages, {
        get(target, property, receiver) {
          const value = Reflect.get(target, property, receiver) as unknown;
          if (typeof value !== "function") {
            return value;
          }

          return (...args: unknown[]) => {
            const inputs = args[0] ?? {};
            const messageOptions = typeof args[1] === "object" && args[1] !== null
              ? args[1] as Record<string, unknown>
              : {};
            return (value as (inputs: unknown, options: Record<string, unknown>) => string)(
              inputs,
              { ...messageOptions, locale },
            );
          };
        },
      });
      cache.set(locale, localized);
      return localized;
    },
  });
}
