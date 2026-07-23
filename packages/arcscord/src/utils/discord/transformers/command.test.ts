import i18next from "i18next";
import { describe, expect, it, vi } from "vitest";
import {
  contextsToAPI,
  integrationTypeToAPI,
  localizationToAPI,
  numberChoiceToAPI,
  optionChannelTypeToAPI,
  optionListToAPI,
  optionToAPI,
  optionTypeToAPI,
  stringChoiceToAPI,
} from "./command";

function createClient(enabled = true) {
  return {
    localeManager: {
      enabled,
      trace: vi.fn(),
      availableLanguages: new Set(["en-US", "fr"]),
      mapLanguage: vi.fn((locale: string) => locale === "en-US" ? "en" : locale),
      i18n: {
        getFixedT: vi.fn((lang: string) => (key: string) => `${lang}:${key}`),
      },
    },
  } as any;
}

async function createI18nClient() {
  const i18n = i18next.createInstance();
  await i18n.init({
    resources: {
      en: {
        test: {
          command: {
            name: "i18n-en",
          },
        },
      },
      fr: {
        test: {
          command: {
            name: "i18n-fr",
          },
        },
      },
    },
    defaultNS: "test",
    enableSelector: "optimize",
  });

  return {
    localeManager: {
      enabled: true,
      trace: vi.fn(),
      availableLanguages: new Set(["id", "en-US", "en-GB", "fr"]),
      mapLanguage: vi.fn((locale: string) => locale.startsWith("en-") ? "en" : locale),
      i18n,
    },
  } as any;
}

describe("command transformers", () => {
  it("returns static localization maps unchanged", () => {
    const client = createClient();
    const locales = {
      "en-US": "Ping",
      "fr": "Ping",
    };

    expect(localizationToAPI(locales, client)).toBe(locales);
  });

  it("skips callback localization when locale manager is disabled", () => {
    const client = createClient(false);

    expect(localizationToAPI(() => "Ping", client)).toBeUndefined();
    expect(client.localeManager.trace).toHaveBeenCalledWith("locale manager is disabled, skip localization");
  });

  it("builds localization maps from callback locales", () => {
    const client = createClient();

    expect(localizationToAPI(t => t("command.description"), client)).toEqual({
      "en-US": "en:command.description",
      "fr": "fr:command.description",
    });
    expect(client.localeManager.mapLanguage).toHaveBeenCalledWith("en-US");
    expect(client.localeManager.i18n.getFixedT).toHaveBeenCalledWith("en");
  });

  it("keeps command name localizations unchanged", () => {
    const client = createClient();

    expect(localizationToAPI(() => "admin.tools:reload", client)).toEqual({
      "en-US": "admin.tools:reload",
      "fr": "admin.tools:reload",
    });
  });

  it("builds callback localizations only for languages with loaded resources", async () => {
    const client = await createI18nClient();

    expect(localizationToAPI(t => (t as any)(($: any) => $.command.name), client)).toEqual({
      "en-US": "i18n-en",
      "en-GB": "i18n-en",
      "fr": "i18n-fr",
    });
  });

  it("maps command contexts, integration types, option types, and channel types", () => {
    expect(contextsToAPI(["guild", "botDm", "privateChannel"])).toEqual([0, 1, 2]);
    expect(integrationTypeToAPI(["guildInstall", "userInstall"])).toEqual([0, 1]);
    expect(optionTypeToAPI("attachment")).toBe(11);
    expect(optionChannelTypeToAPI(["guildText", "guildVoice", "guildForum"])).toEqual([0, 2, 15]);
  });

  it("converts string choices from arrays and records", () => {
    expect(stringChoiceToAPI(["red", { name: "Blue", value: "blue" }])).toEqual([
      { name: "red", value: "red" },
      { name: "Blue", value: "blue" },
    ]);
    expect(stringChoiceToAPI({ Rouge: "red", Bleu: "blue" })).toEqual([
      { name: "Rouge", value: "red" },
      { name: "Bleu", value: "blue" },
    ]);
    expect(stringChoiceToAPI(undefined)).toBeUndefined();
  });

  it("converts number choices from arrays and records", () => {
    expect(numberChoiceToAPI([1, { name: "Two", value: 2 }])).toEqual([
      { name: "1", value: 1 },
      { name: "Two", value: 2 },
    ]);
    expect(numberChoiceToAPI({ One: 1, Two: 2 })).toEqual([
      { name: "One", value: 1 },
      { name: "Two", value: 2 },
    ]);
    expect(numberChoiceToAPI(undefined)).toBeUndefined();
  });

  it("converts command options to Discord API option data", () => {
    const client = createClient();

    expect(optionToAPI("query", {
      type: "string",
      description: "Search query",
      required: true,
      min_length: 2,
      max_length: 20,
      choices: { Dogs: "dogs", Cats: "cats" },
    } as any, client)).toEqual({
      name: "query",
      description: "Search query",
      name_localizations: undefined,
      description_localizations: undefined,
      required: true,
      type: 3,
      min_length: 2,
      max_length: 20,
      autocomplete: undefined,
      choices: [
        { name: "Dogs", value: "dogs" },
        { name: "Cats", value: "cats" },
      ],
    });

    expect(optionToAPI("channel", {
      type: "channel",
      description: "Target channel",
      channel_types: ["guildText", "guildForum"],
    } as any, client)).toMatchObject({
      name: "channel",
      description: "Target channel",
      required: undefined,
      type: 7,
      channel_types: [0, 15],
    });
  });

  it("rejects options that combine choices and autocomplete", () => {
    const client = createClient();

    expect(() => optionToAPI("query", {
      type: "string",
      description: "Search query",
      choices: ["one"],
      autocomplete: true,
    } as any, client)).toThrow("Option \"query\" cannot use choices and autocomplete together");
  });

  it("preserves option declaration order in option lists", () => {
    const client = createClient();

    expect(optionListToAPI({
      query: {
        type: "string",
        description: "Search query",
      },
      limit: {
        type: "integer",
        description: "Result limit",
        min_value: 1,
        max_value: 10,
      },
      includeHidden: {
        type: "boolean",
        description: "Include hidden results",
      },
    } as any, client)).toEqual([
      expect.objectContaining({ name: "query", type: 3 }),
      expect.objectContaining({ name: "limit", type: 4, min_value: 1, max_value: 10 }),
      expect.objectContaining({ name: "includeHidden", type: 5 }),
    ]);
  });
});
