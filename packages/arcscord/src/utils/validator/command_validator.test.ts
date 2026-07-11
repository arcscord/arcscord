import type { ArcClient } from "#/base";
import { ApplicationCommandType } from "discord-api-types/v10";
import i18next from "i18next";
import { describe, expect, it, vi } from "vitest";
import { createCommand, createCommandWithSubs } from "#/base/command/command_func";
import { ArcscordError, validateCommands } from "#/utils";

function createMockClient(): ArcClient {
  return {
    localeManager: {
      enabled: false,
      availableLanguages: ["fr"],
      i18n: {
        getFixedT: vi.fn(() => (key: string) => key),
      },
      mapLanguage: vi.fn((locale: string) => locale),
    },
  } as unknown as ArcClient;
}

function validateTestCommands(commands: Parameters<typeof validateCommands>[0]) {
  return validateCommands(commands, createMockClient(), {
    group: "globalCommands",
  });
}

async function createI18nClient(): Promise<ArcClient> {
  const i18n = i18next.createInstance();
  await i18n.init({
    resources: {
      en: {
        test: {
          i18n: {
            command: {
              name: "i18n-en",
              description: "test of i18n",
            },
          },
        },
      },
      fr: {
        test: {
          i18n: {
            command: {
              name: "i18n-fr",
              description: "test de i18n",
            },
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
      availableLanguages: new Set(["id", "en-US", "en-GB", "fr"]),
      i18n,
      mapLanguage: (locale: string) => locale.startsWith("en-") ? "en" : locale,
    },
  } as unknown as ArcClient;
}

async function validateI18nTestCommands(commands: Parameters<typeof validateCommands>[0]) {
  return validateCommands(commands, await createI18nClient(), {
    group: "globalCommands",
  });
}

describe("command validator", () => {
  it("rejects command names longer than Discord allows", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "a".repeat(33),
        description: "Too long",
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe(`slash command "${"a".repeat(33)}" name must be between 1 and 32 characters (got 33)`);
  });

  it("rejects slash command descriptions longer than Discord allows", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "search",
        description: "a".repeat(101),
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"search\" description must be between 1 and 100 characters (got 101)");
  });

  it("rejects slash command names with disallowed characters", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "Search anime",
        description: "Search anime",
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"Search anime\" name must be lowercase when letters have lowercase variants");
  });

  it("rejects slash option names with disallowed characters", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "search",
        description: "Search anime",
        options: {
          "anime name": {
            type: "string",
            description: "Anime name",
          },
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"search\" option \"anime name\" name contains characters that Discord does not allow");
  });

  it("allows spaces and mixed case for context menu command names", () => {
    const command = createCommand({
      user: {
        name: "View Profile",
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([command]);

    expect(err).toBeNull();
    expect(command.user?.name).toBe("View Profile");
    expect(ApplicationCommandType.User).toBe(2);
  });

  it("rejects invalid slash command name localizations", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "search",
        nameLocalizations: {
          fr: "Chercher",
        },
        description: "Search anime",
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"search\" name localization \"fr\" must be lowercase when letters have lowercase variants");
  });

  it("validates selector localizations against loaded resource values", async () => {
    const command = createCommand({
      slash: {
        name: "i18n",
        nameLocalizations: t => (t as any)(($: any) => $.i18n.command.name),
        description: "default description",
        descriptionLocalizations: t => (t as any)(($: any) => $.i18n.command.description),
      },
      run: ctx => ctx.ok(),
    });

    const [err] = await validateI18nTestCommands([command]);

    expect(err).toBeNull();
  });

  it("rejects invalid callback name localizations instead of sanitizing them", async () => {
    const command = createCommand({
      slash: {
        name: "reload",
        nameLocalizations: () => "admin.tools:reload",
        description: "Reload tools",
      },
      run: ctx => ctx.ok(),
    });

    const [err] = await validateI18nTestCommands([command]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"reload\" name localization \"en-US\" contains characters that Discord does not allow");
  });

  it("rejects unsupported localization keys", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "search",
        nameLocalizations: {
          "xx-XX": "search",
        } as never,
        description: "Search anime",
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"search\" name localization \"xx-XX\" is not a supported Discord locale");
  });

  it("rejects invalid description localizations", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "search",
        description: "Search anime",
        descriptionLocalizations: {
          fr: "a".repeat(101),
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"search\" description localization \"fr\" must be between 1 and 100 characters (got 101)");
  });

  it("rejects invalid string option length bounds", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "search",
        description: "Search anime",
        options: {
          query: {
            type: "string",
            description: "Anime name",
            min_length: 10,
            max_length: 5,
          },
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"search\" option \"query\" min_length cannot be greater than max_length");
  });

  it("rejects string choice values longer than Discord allows", () => {
    const invalidCommand = createCommand({
      slash: {
        name: "search",
        description: "Search anime",
        options: {
          query: {
            type: "string",
            description: "Anime name",
            choices: [
              {
                name: "Long value",
                value: "a".repeat(101),
              },
            ],
          },
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("slash command \"search\" option \"query\" choice \"Long value\" value must be at most 100 characters");
  });

  it("rejects duplicate top-level command names by command type", () => {
    const firstCommand = createCommand({
      slash: {
        name: "search",
        description: "Search anime",
      },
      run: ctx => ctx.ok(),
    });
    const secondCommand = createCommand({
      slash: {
        name: "search",
        description: "Search manga",
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([firstCommand, secondCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("duplicate slash command name \"search\" in group \"globalCommands\"");
  });

  it("rejects duplicate subcommand names in the same command", () => {
    const invalidCommand = createCommandWithSubs({
      name: "search",
      description: "Search commands",
      subCommands: [
        {
          name: "anime",
          description: "Search anime",
          run: vi.fn(),
        },
        {
          name: "anime",
          description: "Search manga",
          run: vi.fn(),
        },
      ],
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toBe("duplicate subcommand in slash command \"search\" name \"anime\" in group \"globalCommands\"");
  });
});
