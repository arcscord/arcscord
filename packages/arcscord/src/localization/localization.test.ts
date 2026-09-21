import type { ArcClient } from "#/base";
import type { LocaleManager } from "#/manager";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalizationAdapter, createLocalizationDefinition } from "./localization";
import { defaultLocalizationReadyTimeout, LocalizationService } from "./localization_service";

function createLegacyManager(): LocaleManager {
  return {
    enabled: false,
    ready: Promise.resolve(),
    mapLanguage: (locale: string) => locale,
    detectLanguage: async () => "en-US",
  } as unknown as LocaleManager;
}

function createClient(): ArcClient {
  return {
    logger: {
      warn: vi.fn(),
    },
  } as unknown as ArcClient;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("localization adapters", () => {
  it("keeps the adapter-specific surface typed and bound to context locales", () => {
    const adapter = createLocalizationAdapter({
      defaultLocale: "en",
      locales: ["en", "fr"],
      getFixed: locale => ({ message: (name: string) => `${locale}:${name}` }),
    });

    expect(adapter.getFixed({ locale: "fr" }).message("Ada")).toBe("fr:Ada");
    expect(adapter.getFixed("en").message("Ada")).toBe("en:Ada");
  });

  it("maps Discord locales and resolves lazy command metadata", async () => {
    const adapter = createLocalizationAdapter({
      defaultLocale: "en",
      locales: ["en", "fr"],
      getFixed: locale => ({ label: () => `${locale}-label` }),
    });
    const service = new LocalizationService(createClient(), {
      adapter,
      discordLocales: ["en-US", "fr", "de"],
    }, createLegacyManager());
    const definition = createLocalizationDefinition(
      adapter,
      locale => adapter.getFixed(locale).label(),
    );

    await expect(service.detectLanguage({
      interaction: { locale: "fr" } as never,
      guild: null,
      user: null,
      channel: null,
    })).resolves.toBe("fr");
    expect(service.resolveLocalizations(definition)).toEqual({
      "en-US": "en-label",
      "fr": "fr-label",
    });
  });

  it("waits for initialization and applies custom language mappings", async () => {
    let finishInitialization: (() => void) | undefined;
    const adapter = createLocalizationAdapter({
      defaultLocale: "en",
      locales: ["en", "fr-CH"],
      ready: new Promise<void>((resolve) => {
        finishInitialization = resolve;
      }),
      getFixed: locale => locale,
    });
    const service = new LocalizationService(createClient(), {
      adapter,
      languageMap: { "fr-CH": "fr" },
      localeDetector: () => "fr",
    }, createLegacyManager());
    let settled = false;
    const detected = service.detectLanguage({
      interaction: null,
      guild: null,
      user: null,
      channel: null,
    }).then((locale) => {
      settled = true;
      return locale;
    });

    await Promise.resolve();
    expect(settled).toBe(false);
    finishInitialization?.();
    await expect(detected).resolves.toBe("fr-CH");
  });

  it("rejects adapter initialization after the configured timeout", async () => {
    vi.useFakeTimers();
    const adapter = createLocalizationAdapter({
      defaultLocale: "en",
      locales: ["en"],
      ready: new Promise<void>(() => {}),
      getFixed: locale => locale,
    });
    const service = new LocalizationService(createClient(), {
      adapter,
      readyTimeout: 100,
    }, createLegacyManager());
    const rejection = expect(service.waitReady()).rejects.toMatchObject({
      code: "LOCALIZATION_READY_TIMEOUT",
      name: "LocalizationReadyTimeoutError",
      timeout: 100,
    });

    await vi.advanceTimersByTimeAsync(100);
    await rejection;
  });

  it("uses the default adapter initialization timeout", async () => {
    vi.useFakeTimers();
    const adapter = createLocalizationAdapter({
      defaultLocale: "en",
      locales: ["en"],
      ready: new Promise<void>(() => {}),
      getFixed: locale => locale,
    });
    const service = new LocalizationService(createClient(), { adapter }, createLegacyManager());
    const rejection = expect(service.waitReady()).rejects.toMatchObject({
      code: "LOCALIZATION_READY_TIMEOUT",
      timeout: defaultLocalizationReadyTimeout,
    });

    await vi.advanceTimersByTimeAsync(defaultLocalizationReadyTimeout - 1);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
  });

  it("preserves adapter initialization errors and clears the timeout", async () => {
    vi.useFakeTimers();
    const failure = new Error("catalog loading failed");
    const adapter = createLocalizationAdapter({
      defaultLocale: "en",
      locales: ["en"],
      ready: Promise.reject(failure),
      getFixed: locale => locale,
    });
    const service = new LocalizationService(createClient(), {
      adapter,
      readyTimeout: 100,
    }, createLegacyManager());
    const existingTimers = vi.getTimerCount();

    await expect(service.waitReady()).rejects.toBe(failure);
    expect(vi.getTimerCount()).toBe(existingTimers);
  });

  it("supports an explicit infinite initialization wait", async () => {
    vi.useFakeTimers();
    let finishInitialization: (() => void) | undefined;
    const adapter = createLocalizationAdapter({
      defaultLocale: "en",
      locales: ["en"],
      ready: new Promise<void>((resolve) => {
        finishInitialization = resolve;
      }),
      getFixed: locale => locale,
    });
    const service = new LocalizationService(createClient(), {
      adapter,
      readyTimeout: false,
    }, createLegacyManager());
    let settled = false;
    const ready = service.waitReady();
    void ready.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
    finishInitialization?.();
    await expect(ready).resolves.toBeUndefined();
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid initialization timeout %s",
    (readyTimeout) => {
      const adapter = createLocalizationAdapter({
        defaultLocale: "en",
        locales: ["en"],
        getFixed: locale => locale,
      });

      expect(() => new LocalizationService(createClient(), {
        adapter,
        readyTimeout,
      }, createLegacyManager())).toThrow("localization.readyTimeout");
    },
  );

  it("falls back to the adapter default and rejects foreign definitions", async () => {
    const adapter = createLocalizationAdapter({
      defaultLocale: "en",
      locales: ["en"],
      getFixed: locale => locale,
    });
    const foreign = createLocalizationAdapter({
      defaultLocale: "fr",
      locales: ["fr"],
      getFixed: locale => locale,
    });
    const service = new LocalizationService(createClient(), {
      adapter,
      localeDetector: () => "missing",
    }, createLegacyManager());

    await expect(service.detectLanguage({
      interaction: null,
      guild: null,
      user: null,
      channel: null,
    })).resolves.toBe("en");
    const foreignDefinition = createLocalizationDefinition(foreign, locale => foreign.getFixed(locale));
    expect(() => service.resolveLocalizations(foreignDefinition)).toThrow(
      "different adapter instance",
    );
  });

  it("delegates detection to LocaleManager in compatibility mode", async () => {
    const legacyManager = createLegacyManager();
    const detectLanguage = vi.spyOn(legacyManager, "detectLanguage").mockResolvedValue("fr");
    const context = {
      interaction: null,
      guild: null,
      user: null,
      channel: null,
    };
    const service = new LocalizationService(createClient(), undefined, legacyManager);

    await expect(service.detectLanguage(context)).resolves.toBe("fr");
    expect(detectLanguage).toHaveBeenCalledWith(context);
  });
});
