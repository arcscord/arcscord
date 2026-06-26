import type { ArcClient } from "#/base";
import i18next from "i18next";
import { describe, expect, it, vi } from "vitest";
import { LocaleManager } from "./locale_manager.class";

function createClient(): ArcClient {
  return {
    arcOptions: {
      enableInternalTrace: false,
    },
    createLogger: () => ({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      logError: vi.fn(),
      fatal: vi.fn(),
      fatalError: vi.fn(),
      log: vi.fn(),
    }),
  } as unknown as ArcClient;
}

describe("locale manager", () => {
  it("normalizes default options when localization is enabled", async () => {
    const manager = new LocaleManager(createClient(), {
      enabled: true,
      i18nOptions: {
        resources: {
          en: {
            translation: {
              ping: "Pong",
            },
          },
        },
        fallbackLng: "en",
        enableSelector: "optimize",
      },
    });

    await manager.ready;

    expect(manager.mapLanguage("en-US")).toBe("en");
    expect(manager.mapLanguage("fr")).toBe("fr");
    expect(manager.availableLanguages.has("en-US")).toBe(true);
    expect(manager.t("ping")).toBe("Pong");
  });

  it("uses an isolated i18next instance for each manager", async () => {
    const first = new LocaleManager(createClient(), {
      enabled: true,
      i18nOptions: {
        resources: {
          en: {
            translation: {
              value: "first",
            },
          },
        },
        fallbackLng: "en",
        enableSelector: "optimize",
      },
    });
    const second = new LocaleManager(createClient(), {
      enabled: true,
      i18nOptions: {
        resources: {
          en: {
            translation: {
              value: "second",
            },
          },
        },
        fallbackLng: "en",
        enableSelector: "optimize",
      },
    });

    await Promise.all([first.ready, second.ready]);

    expect(first.t("value")).toBe("first");
    expect(second.t("value")).toBe("second");
  });

  it("does not mutate a custom i18n instance", async () => {
    const customI18n = i18next.createInstance();
    await customI18n.init({
      resources: {
        fr: {
          translation: {
            value: "bonjour",
          },
        },
      },
      fallbackLng: "fr",
      enableSelector: "optimize",
    });

    const manager = new LocaleManager(createClient(), {
      enabled: true,
      customI18n,
    });

    await manager.ready;

    expect(manager.i18n).toBe(customI18n);
    expect(manager.t("value")).toBe("bonjour");
  });

  it("falls back when the language detector throws", async () => {
    const manager = new LocaleManager(createClient(), {
      enabled: true,
      i18nOptions: {
        fallbackLng: "fr",
        enableSelector: "optimize",
      },
      langDetector: () => {
        throw new Error("boom");
      },
    });

    await manager.ready;

    await expect(manager.detectLanguage({
      interaction: null,
      guild: null,
      user: null,
      channel: null,
    })).resolves.toBe("fr");
  });
});
