import i18next from "i18next";
import { describe, expect, it } from "vitest";
import { createI18nextAdapter } from "./index";

declare module "i18next" {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface CustomTypeOptions {
    defaultNS: "translation";
    enableSelector: "optimize";
    resources: {
      translation: {
        greeting: string;
        value: string;
      };
    };
  }
}

describe("i18next adapter", () => {
  it("initializes an isolated instance and resolves runtime and metadata translations", async () => {
    const adapter = createI18nextAdapter({
      options: {
        defaultNS: "translation",
        fallbackLng: "en",
        resources: {
          en: { translation: { greeting: "Hello" } },
          fr: { translation: { greeting: "Bonjour" } },
        },
      },
    });
    await adapter.ready;

    expect(adapter.getFixed("fr")($ => $.greeting)).toBe("Bonjour");
    expect(adapter.locales).toEqual(new Set(["en", "fr"]));
    expect(adapter.discord($ => $.greeting).resolve("en")).toBe("Hello");
    expect(adapter.discord($ => $.greeting).resolve("fr")).toBe("Bonjour");
  });

  it("uses a custom instance without mutating it", async () => {
    const instance = i18next.createInstance();
    await instance.init({
      fallbackLng: "fr",
      resources: { fr: { translation: { value: "oui" } } },
    });
    const before = instance.options;
    const adapter = createI18nextAdapter({ instance });
    await adapter.ready;

    expect(adapter.i18n).toBe(instance);
    expect(instance.options).toBe(before);
    expect(adapter.getFixed({ locale: "fr" })($ => $.value)).toBe("oui");
  });

  it("filters locales without resources in the configured namespaces", async () => {
    const adapter = createI18nextAdapter({
      locales: ["en", "fr", "de"],
      options: {
        defaultNS: "commands",
        fallbackLng: "en",
        resources: {
          en: { commands: { ping: "Ping" } },
          fr: { other: { ping: "Ping" } },
          de: { commands: { ping: "Ping" } },
        },
      },
    });
    await adapter.ready;

    expect(adapter.locales).toEqual(new Set(["en", "de"]));
  });

  it("uses the global fallback from a fallback object", async () => {
    const adapter = createI18nextAdapter({
      options: {
        fallbackLng: { fr: ["en"], default: ["de"] },
        resources: { de: { translation: { greeting: "Hallo" } } },
      },
    });
    await adapter.ready;

    expect(adapter.defaultLocale).toBe("de");
    expect(Object.keys(adapter)).toContain("defaultLocale");
    expect(adapter.locales).toEqual(new Set(["de"]));
  });

  it("selects a resource locale when the fallback object has no valid global fallback", async () => {
    const fallbackLngs: Record<string, string[]>[] = [{ fr: ["en"] }, { default: ["en"] }];
    for (const fallbackLng of fallbackLngs) {
      const adapter = createI18nextAdapter({
        options: {
          fallbackLng,
          resources: { de: { translation: { greeting: "Hallo" } } },
        },
      });
      await adapter.ready;

      expect(adapter.defaultLocale).toBe("de");
      expect(adapter.locales).toEqual(new Set(["de"]));
    }
  });

  it("keeps an explicit default locale ahead of an object fallback", async () => {
    const adapter = createI18nextAdapter({
      defaultLocale: "de",
      options: {
        fallbackLng: { default: ["fr"] },
        resources: {
          de: { translation: { greeting: "Hallo" } },
          fr: { translation: { greeting: "Bonjour" } },
        },
      },
    });
    await adapter.ready;

    expect(adapter.defaultLocale).toBe("de");
    expect(adapter.locales).toEqual(new Set(["de", "fr"]));
  });
});
