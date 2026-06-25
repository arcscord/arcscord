import type { ArcClient } from "#/base";
import { ApplicationCommandType } from "discord-api-types/v10";
import { describe, expect, it, vi } from "vitest";
import { buildCommandWithSubs, createCommand } from "#/base/command/command_func";
import { CommandValidationError, validateCommands } from "#/utils";

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
    createError: options => new CommandValidationError(options),
    group: "globalCommands",
  });
}

describe("command validator", () => {
  it("rejects command names longer than Discord allows", () => {
    const invalidCommand = createCommand({
      build: {
        slash: {
          name: "a".repeat(33),
          description: "Too long",
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe(`slash command "${"a".repeat(33)}" name must be between 1 and 32 characters (got 33)`);
  });

  it("rejects slash command descriptions longer than Discord allows", () => {
    const invalidCommand = createCommand({
      build: {
        slash: {
          name: "search",
          description: "a".repeat(101),
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("slash command \"search\" description must be between 1 and 100 characters (got 101)");
  });

  it("rejects slash command names with disallowed characters", () => {
    const invalidCommand = createCommand({
      build: {
        slash: {
          name: "Search anime",
          description: "Search anime",
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("slash command \"Search anime\" name must be lowercase when letters have lowercase variants");
  });

  it("rejects slash option names with disallowed characters", () => {
    const invalidCommand = createCommand({
      build: {
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
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("slash command \"search\" option \"anime name\" name contains characters that Discord does not allow");
  });

  it("allows spaces and mixed case for context menu command names", () => {
    const command = createCommand({
      build: {
        user: {
          name: "View Profile",
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([command]);

    expect(err).toBeNull();
    expect(command.build.user?.name).toBe("View Profile");
    expect(ApplicationCommandType.User).toBe(2);
  });

  it("rejects invalid slash command name localizations", () => {
    const invalidCommand = createCommand({
      build: {
        slash: {
          name: "search",
          nameLocalizations: {
            fr: "Chercher",
          },
          description: "Search anime",
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("slash command \"search\" name localization \"fr\" must be lowercase when letters have lowercase variants");
  });

  it("rejects unsupported localization keys", () => {
    const invalidCommand = createCommand({
      build: {
        slash: {
          name: "search",
          nameLocalizations: {
            "xx-XX": "search",
          } as never,
          description: "Search anime",
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("slash command \"search\" name localization \"xx-XX\" is not a supported Discord locale");
  });

  it("rejects invalid description localizations", () => {
    const invalidCommand = createCommand({
      build: {
        slash: {
          name: "search",
          description: "Search anime",
          descriptionLocalizations: {
            fr: "a".repeat(101),
          },
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("slash command \"search\" description localization \"fr\" must be between 1 and 100 characters (got 101)");
  });

  it("rejects invalid string option length bounds", () => {
    const invalidCommand = createCommand({
      build: {
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
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("slash command \"search\" option \"query\" min_length cannot be greater than max_length");
  });

  it("rejects string choice values longer than Discord allows", () => {
    const invalidCommand = createCommand({
      build: {
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
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("slash command \"search\" option \"query\" choice \"Long value\" value must be at most 100 characters");
  });

  it("rejects duplicate top-level command names by command type", () => {
    const firstCommand = createCommand({
      build: {
        slash: {
          name: "search",
          description: "Search anime",
        },
      },
      run: ctx => ctx.ok(),
    });
    const secondCommand = createCommand({
      build: {
        slash: {
          name: "search",
          description: "Search manga",
        },
      },
      run: ctx => ctx.ok(),
    });

    const [err] = validateTestCommands([firstCommand, secondCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("duplicate slash command name \"search\" in group \"globalCommands\"");
  });

  it("rejects duplicate subcommand names in the same command", () => {
    const invalidCommand = buildCommandWithSubs({
      name: "search",
      description: "Search commands",
      subCommands: [
        {
          build: {
            name: "anime",
            description: "Search anime",
          },
          run: vi.fn(),
        },
        {
          build: {
            name: "anime",
            description: "Search manga",
          },
          run: vi.fn(),
        },
      ],
    });

    const [err] = validateTestCommands([invalidCommand]);

    expect(err).toBeInstanceOf(CommandValidationError);
    expect(err?.message).toBe("duplicate subcommand in slash command \"search\" name \"anime\" in group \"globalCommands\"");
  });
});
