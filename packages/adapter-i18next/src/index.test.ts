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
});
