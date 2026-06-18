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

  it("sanitizes command name localizations", () => {
    const client = createClient();

    expect(localizationToAPI(() => "admin.tools:reload", client, true)).toEqual({
      "en-US": "admin-tools_reload",
      "fr": "admin-tools_reload",
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
