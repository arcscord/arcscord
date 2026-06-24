import type { ArcClient } from "#/base";
import type { Command } from "#/base/command/command_definition.type";
import { ApplicationCommandOptionType, ApplicationCommandType, Routes } from "discord-api-types/v10";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { buildCommandWithSubs, createCommand } from "#/base/command/command_func";
import { CommandManager } from "./command_manager.class";

function createMockClient() {
  const client = {
    arcOptions: {
      applicationId: "app_1",
      enableInternalTrace: false,
    },
    application: null,
    guilds: {
      cache: new Map(),
    },
    rest: {
      put: vi.fn(),
    },
    localeManager: {
      enabled: false,
      t: vi.fn((key: string) => key),
      detectLanguage: vi.fn(() => "en"),
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
    on: vi.fn(),
  } as unknown as ArcClient;

  return {
    client,
    manager: new CommandManager(client),
  };
}

describe("command manager", () => {
  it("registers global commands through REST when applicationId is available before ready", async () => {
    const { client, manager } = createMockClient();
    vi.mocked(client.rest.put).mockResolvedValue([
      {
        id: "cmd_1",
        application_id: "app_1",
        version: "1",
        name: "ping",
        description: "Ping command",
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    const result = await manager.pushGlobalCommands([
      {
        name: "ping",
        description: "Ping command",
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    expect(result[0]).toBeNull();
    expect(client.rest.put).toHaveBeenCalledWith(
      Routes.applicationCommands("app_1"),
      {
        body: [
          {
            name: "ping",
            description: "Ping command",
            type: ApplicationCommandType.ChatInput,
          },
        ],
      },
    );
    expect(result[1]).toEqual([
      {
        id: "cmd_1",
        name: "ping",
        type: ApplicationCommandType.ChatInput,
        guildId: null,
      },
    ]);
  });

  it("registers guild commands through REST when the guild cache is not ready", async () => {
    const { client, manager } = createMockClient();
    vi.mocked(client.rest.put).mockResolvedValue([
      {
        id: "cmd_2",
        application_id: "app_1",
        guild_id: "guild_1",
        version: "1",
        name: "ping",
        description: "Ping command",
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    const result = await manager.pushGuildCommands("guild_1", [
      {
        name: "ping",
        description: "Ping command",
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    expect(result[0]).toBeNull();
    expect(client.rest.put).toHaveBeenCalledWith(
      Routes.applicationGuildCommands("app_1", "guild_1"),
      {
        body: [
          {
            name: "ping",
            description: "Ping command",
            type: ApplicationCommandType.ChatInput,
          },
        ],
      },
    );
    expect(result[1]).toEqual([
      {
        id: "cmd_2",
        name: "ping",
        type: ApplicationCommandType.ChatInput,
        guildId: "guild_1",
      },
    ]);
  });

  it("dispatches autocomplete interactions to the focused option handler", async () => {
    const { manager } = createMockClient();
    const respond = vi.fn();
    const animeHandler = vi.fn(ctx => ctx.sendChoices(["Naruto"]));
    const yearHandler = vi.fn(ctx => ctx.sendChoices([2002]));
    const command = createCommand({
      build: {
        slash: {
          name: "search",
          description: "Search anime",
          options: {
            anime: {
              type: "string",
              description: "Anime name",
              autocomplete: true,
            },
            year: {
              type: "integer",
              description: "Release year",
              autocomplete: true,
            },
          },
        },
      },
      autocomplete: {
        anime: animeHandler,
        year: yearHandler,
      },
      run: ctx => ctx.ok(),
    });

    manager.commands.set("cmd_1_search", command);

    const autocompleteManager = manager as unknown as {
      handleAutocomplete: (interaction: {
        channel: null;
        commandName: string;
        command: {
          id: string;
          name: string;
          type: ApplicationCommandType;
          guildId: null;
          toJSON: () => object;
        };
        guild: null;
        locale: string;
        options: {
          getFocused: (full: boolean) => string | { name: string; value: string; type: ApplicationCommandOptionType };
        };
        respond: typeof respond;
        user: { id: string };
      }) => Promise<void>;
    };

    await autocompleteManager.handleAutocomplete({
      channel: null,
      commandName: "search",
      command: {
        id: "cmd_1",
        name: "search",
        type: ApplicationCommandType.ChatInput,
        guildId: null,
        toJSON: () => ({ id: "cmd_1", name: "search" }),
      },
      guild: null,
      locale: "en-US",
      options: {
        getFocused: vi.fn((full: boolean) => full
          ? { name: "anime", value: "Nar", type: ApplicationCommandOptionType.String }
          : "Nar"),
      },
      respond,
      user: { id: "user_1" },
    });

    expect(animeHandler).toHaveBeenCalledTimes(1);
    expect(yearHandler).not.toHaveBeenCalled();
    expect(animeHandler.mock.calls[0]?.[0]).toMatchObject({
      name: "anime",
      value: "Nar",
    });
    expect(respond).toHaveBeenCalledWith([
      { name: "Naruto", value: "Naruto" },
    ]);
  });

  it("rejects missing autocomplete handlers when loading commands", () => {
    const { manager } = createMockClient();
    const invalidCommand = {
      build: {
        slash: {
          name: "search",
          description: "Search anime",
          options: {
            anime: {
              type: "string",
              description: "Anime name",
              autocomplete: true,
            },
          },
        },
      },
      run: vi.fn(),
    } as unknown as Command;

    const [err] = manager.loadCommands([invalidCommand]);

    expect(err?.message).toBe("missing autocomplete handler for option \"anime\" in command \"search\"");
  });

  it("rejects autocomplete handlers that do not match enabled options when loading commands", () => {
    const { manager } = createMockClient();
    const invalidCommand = {
      build: {
        slash: {
          name: "search",
          description: "Search anime",
          options: {
            anime: {
              type: "string",
              description: "Anime name",
            },
          },
        },
      },
      autocomplete: {
        anime: vi.fn(),
      },
      run: vi.fn(),
    } as unknown as Command;

    const [err] = manager.loadCommands([invalidCommand]);

    expect(err?.message).toBe("autocomplete handler \"anime\" targets an option without autocomplete enabled in command \"search\"");
  });

  it("rejects missing autocomplete handlers for subcommands when loading commands", () => {
    const { manager } = createMockClient();
    const invalidCommand = {
      name: "search",
      description: "Search commands",
      subCommands: [
        {
          build: {
            name: "anime",
            description: "Search anime",
            options: {
              query: {
                type: "string",
                description: "Anime name",
                autocomplete: true,
              },
            },
          },
          run: vi.fn(),
        },
      ],
    } as unknown as Command;

    const [err] = manager.loadCommands([invalidCommand]);

    expect(err?.message).toBe("missing autocomplete handler for option \"query\" in command \"search.anime\"");
  });

  it("types autocomplete handlers from their option definitions", () => {
    const fullCommand = createCommand({
      build: {
        slash: {
          name: "full",
          description: "Full command",
        },
      },
      run: ctx => ctx.ok(),
    });

    buildCommandWithSubs({
      name: "sub",
      description: "Subcommands",
      subCommands: [
        // @ts-expect-error full commands cannot be registered as subcommands.
        fullCommand,
      ],
    });

    createCommand({
      build: {
        slash: {
          name: "search",
          description: "Search anime",
          options: {
            anime: {
              type: "string",
              description: "Anime name",
              autocomplete: true,
            },
            year: {
              type: "integer",
              description: "Release year",
              autocomplete: true,
            },
            hidden: {
              type: "boolean",
              description: "Hidden result",
            },
          },
        },
      },
      autocomplete: {
        anime: (ctx) => {
          expectTypeOf(ctx.name).toEqualTypeOf<"anime">();
          expectTypeOf(ctx.value).toEqualTypeOf<string>();
          void ctx.sendChoices(["Naruto"]);
          // @ts-expect-error string autocomplete choices cannot be numeric-only.
          void ctx.sendChoices([2002]);
          return ctx.ok();
        },
        year: (ctx) => {
          expectTypeOf(ctx.name).toEqualTypeOf<"year">();
          expectTypeOf(ctx.value).toEqualTypeOf<string>();
          void ctx.sendChoices([2002]);
          // @ts-expect-error numeric autocomplete choices cannot be string-only.
          void ctx.sendChoices(["Naruto"]);
          return ctx.ok();
        },
        // @ts-expect-error only options with autocomplete: true can have handlers.
        hidden: ctx => ctx.ok(),
      },
      run: ctx => ctx.ok(),
    });
  });
});
