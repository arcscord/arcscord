import type { LocalizationAdapter, LocalizationDefinition } from "arcscord";
import { createLocalizationAdapter, createLocalizationDefinition } from "arcscord";

/** Minimal structural shape of a generated Paraglide messages module. */
export type ParaglideMessages = Record<string, (...args: never[]) => string>;

/** A generated Paraglide message function. */
export type ParaglideMessage = (...args: never[]) => string;

/** Input tuple inferred from a generated Paraglide message function. */
export type ParaglideMessageInputs<Message extends ParaglideMessage> = Parameters<Message> extends []
  ? []
  : undefined extends Parameters<Message>[0]
    ? [inputs?: Parameters<Message>[0]]
    : [inputs: Parameters<Message>[0]];

/** Builds Discord metadata from generated Paraglide message functions. */
export type ParaglideLocalizationBuilder<Messages extends object> = <
  Message extends Extract<Messages[keyof Messages], ParaglideMessage>,
>(
  message: Message,
  ...inputs: ParaglideMessageInputs<Message>
) => LocalizationDefinition;

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

/** Paraglide adapter with its provider-native Discord metadata builder. */
export type ParaglideAdapter<Messages extends object> = LocalizationAdapter<Messages> & {
  /** Creates a lazy Discord localization from a generated message function. */
  readonly discord: ParaglideLocalizationBuilder<Messages>;
};

/** Creates a Paraglide adapter without changing Paraglide's global locale. */
export function createParaglideAdapter<Messages extends object>(
  options: ParaglideAdapterOptions<Messages>,
): ParaglideAdapter<Messages> {
  const cache = new Map<string, Messages>();

  const adapter = createLocalizationAdapter<Messages>({
    defaultLocale: options.runtime.baseLocale,
    locales: options.runtime.locales,
    getFixed: (locale) => {
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
  const discord = ((message: ParaglideMessage, inputs?: unknown) => {
    return createLocalizationDefinition(adapter, (locale) => {
      const result = (message as unknown as (
        inputs: unknown,
        options: { locale: string },
      ) => unknown)(inputs ?? {}, { locale });
      if (typeof result !== "string") {
        throw new TypeError("Paraglide command metadata messages must resolve to a string");
      }
      return result;
    });
  }) as ParaglideLocalizationBuilder<Messages>;

  return Object.assign(adapter, {
    discord,
  });
}
