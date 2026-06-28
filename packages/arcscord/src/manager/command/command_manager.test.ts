import type { CommandInteraction } from "discord.js";
import type { Command } from "#/base/command/command_definition.type";
import { ApplicationCommandOptionType, ApplicationCommandType, InteractionContextType, Routes } from "discord-api-types/v10";
import { describe, expect, it, vi } from "vitest";
import { createCommand } from "#/base/command/command_func";
import { createMockClient } from "#/testing";
import { CommandManager } from "./command_manager.class";

function createMockClientWithManager() {
  const client = createMockClient();
  return { client, manager: new CommandManager(client) };
}

function createMockSlashInteraction(overrides: Partial<CommandInteraction> = {}): CommandInteraction {
  return {
    command: {
      id: "cmd_1",
      name: "ping",
      type: ApplicationCommandType.ChatInput,
      guildId: null,
      toJSON: () => ({}),
    },
    commandName: "ping",
    user: { id: "user_1" },
    guild: null,
    guildId: null,
    member: null,
    channel: null,
    channelId: null,
    context: InteractionContextType.Guild,
    authorizingIntegrationOwners: {},
    locale: "en-US",
    isChatInputCommand: () => true,
    isUserContextMenuCommand: () => false,
    isMessageContextMenuCommand: () => false,
    isRepliable: () => true,
    reply: vi.fn(),
    toJSON: () => ({}),
    options: {
      data: [],
      getSubcommand: () => null,
      getSubcommandGroup: () => null,
    },
    ...overrides,
  } as unknown as CommandInteraction;
}

type HandleInteractionFn = (interaction: CommandInteraction) => Promise<void>;
type ExposedHandleInteraction = { handleInteraction: HandleInteractionFn };

describe("command manager", () => {
  it("registers global commands through REST when applicationId is available before ready", async () => {
    const { client, manager } = createMockClientWithManager();
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
    const { client, manager } = createMockClientWithManager();
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
    const { manager } = createMockClientWithManager();
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
    const { manager } = createMockClientWithManager();
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
    const { manager } = createMockClientWithManager();
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
    const { manager } = createMockClientWithManager();
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

  it("passes status returned when run() returns ok", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const command = createCommand({
      build: { slash: { name: "ping", description: "Ping" } },
      run: ctx => ctx.ok(),
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockSlashInteraction(),
    );

    expect(resultHandler).toHaveBeenCalledOnce();
    expect(resultHandler.mock.calls[0]?.[0].status).toBe("returned");
    expect(resultHandler.mock.calls[0]?.[0].result[0]).toBeNull();
  });

  it("passes status thrown and preserves the raw thrown value", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const thrown = new Error("boom");
    const command = createCommand({
      build: { slash: { name: "ping", description: "Ping" } },
      run: () => {
        throw thrown;
      },
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockSlashInteraction(),
    );

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.status).toBe("thrown");
    expect(infos.thrownValue).toBe(thrown);
    expect("result" in infos).toBe(false);
  });

  it("normalizes void run() return to ok(true) in resultHandler", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const command = createCommand({
      build: { slash: { name: "ping", description: "Ping" } },
      run: () => {},
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockSlashInteraction(),
    );

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.status).toBe("returned");
    expect(infos.result[0]).toBeNull();
    expect(infos.result[1]).toBe(true);
  });

  it("normalizes string run() return to ok(string) in resultHandler", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const command = createCommand({
      build: { slash: { name: "ping", description: "Ping" } },
      run: () => "pong!",
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockSlashInteraction(),
    );

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.status).toBe("returned");
    expect(infos.result[0]).toBeNull();
    expect(infos.result[1]).toBe("pong!");
  });

  it("applies dispatch diagnostics level for commandNotFound", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, {
      resultHandler,
      dispatchDiagnostics: {
        commandNotFound: { level: "warn", reply: false },
      },
    });

    const interaction = createMockSlashInteraction();
    (interaction as unknown as Record<string, unknown>).command = null;

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(resultHandler).not.toHaveBeenCalled();
    expect(managerWithOptions.logger.warning).toHaveBeenCalled();
  });

  it("dispatches user context menu interaction to run()", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const run = vi.fn(ctx => ctx.ok());
    const command = createCommand({
      build: { user: { name: "Profile" } },
      run,
    });
    managerWithOptions.commands.set("cmd_1_Profile", command);

    const interaction = {
      command: { id: "cmd_1", name: "Profile", type: ApplicationCommandType.User, guildId: null, toJSON: () => ({}) },
      commandName: "Profile",
      user: { id: "user_1" },
      guild: null,
      guildId: null,
      member: null,
      channel: null,
      channelId: null,
      context: InteractionContextType.Guild,
      authorizingIntegrationOwners: {},
      locale: "en-US",
      isChatInputCommand: () => false,
      isUserContextMenuCommand: () => true,
      isMessageContextMenuCommand: () => false,
      isRepliable: () => true,
      reply: vi.fn(),
      toJSON: () => ({}),
      targetUser: { id: "target_1" },
      targetMember: null,
    } as unknown as CommandInteraction;

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(run).toHaveBeenCalledOnce();
    expect(resultHandler.mock.calls[0]?.[0].result[0]).toBeNull();
  });

  it("dispatches message context menu interaction to run()", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const run = vi.fn(ctx => ctx.ok());
    const command = createCommand({
      build: { message: { name: "Info" } },
      run,
    });
    managerWithOptions.commands.set("cmd_1_Info", command);

    const targetMessage = { id: "msg_1" };
    const interaction = {
      command: { id: "cmd_1", name: "Info", type: ApplicationCommandType.Message, guildId: null, toJSON: () => ({}) },
      commandName: "Info",
      user: { id: "user_1" },
      guild: null,
      guildId: null,
      member: null,
      channel: null,
      channelId: null,
      context: InteractionContextType.Guild,
      authorizingIntegrationOwners: {},
      locale: "en-US",
      isChatInputCommand: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => true,
      isRepliable: () => true,
      reply: vi.fn(),
      toJSON: () => ({}),
      targetMessage,
    } as unknown as CommandInteraction;

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(run).toHaveBeenCalledOnce();
    expect(resultHandler.mock.calls[0]?.[0].result[0]).toBeNull();
  });
});
