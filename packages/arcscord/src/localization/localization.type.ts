import type { BaseInteraction, Guild, TextBasedChannel, User } from "discord.js";
import type { Locale, LocaleMap, MaybePromise } from "#/utils";

/** Values available when Arcscord resolves the language of an interaction. */
export type LocaleDetectionContext = {
  interaction: BaseInteraction | null;
  guild: Guild | null;
  user: User | null;
  channel: TextBasedChannel | null;
};

/** Resolves a Discord or provider locale for an interaction. */
export type LocaleDetector = (context: LocaleDetectionContext) => MaybePromise<string | undefined>;

/** A context-like value from which a provider locale can be read. */
export type Localizable = string | { locale: string };

/**
 * Opaque lazy localization used for Discord command metadata.
 *
 * Adapter packages create values through {@link createLocalizationDefinition}.
 */
export type LocalizationDefinition = {
  /** @internal */
  readonly adapter: LocalizationAdapter<unknown>;
  /** @internal */
  readonly resolve: (locale: string) => string;
  /** @internal */
  readonly type: "arcscord.localization";
};

/**
 * Library-independent localization adapter consumed by Arcscord.
 *
 * @typeParam Surface - The typed translation surface returned to application code.
 */
export type LocalizationAdapter<Surface = unknown> = {
  /** Provider locale used when detection cannot produce a usable locale. */
  readonly defaultLocale: string;
  /** Provider locales for which translations are available. */
  readonly locales: ReadonlySet<string>;
  /** Resolves when the provider can synchronously translate messages. */
  readonly ready: Promise<void>;
  /** Returns the provider-specific translation surface fixed to a locale. */
  getFixed: (value: Localizable) => Surface;
};

/** Inputs used by {@link createLocalizationAdapter}. */
export type CreateLocalizationAdapterOptions<Surface> = {
  /** Provider locale used when detection cannot produce a usable locale. */
  defaultLocale: string;
  /** Creates a translation surface fixed to `locale`. */
  getFixed: (locale: string) => Surface;
  /** Provider locales for which translations are available. */
  locales: Iterable<string>;
  /** Provider initialization promise. */
  ready?: PromiseLike<void>;
};

/** Configuration for Arcscord's provider-independent localization runtime. */
export type LocalizationOptions = {
  /** Adapter used for runtime and command metadata translations. */
  adapter: LocalizationAdapter<unknown>;
  /** Discord locales considered while generating command metadata. */
  discordLocales?: Locale[] | Set<Locale>;
  /** Custom interaction locale detector. */
  localeDetector?: LocaleDetector;
  /** Maps provider language keys to one or more Discord locales. */
  languageMap?: Partial<Record<string, Locale | Locale[]>>;
  /**
   * Maximum time to wait for {@link LocalizationAdapter.ready}, in milliseconds.
   * Set to `false` to wait indefinitely.
   *
   * @default 30000
   */
  readyTimeout?: number | false;
};

/** Command metadata accepted by Arcscord's localization transformer. */
export type Localizations = LocaleMap | LocalizationDefinition;
