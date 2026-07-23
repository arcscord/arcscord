import type { AutocompleteInteraction, CommandInteraction } from "discord.js";
import type { CommandContext } from "#/base/command";
import type { Command } from "#/base/command/command_definition.type";
import type { CommandMiddlewareRun } from "#/base/command/command_middleware";
import { ok } from "@arcscord/error";
import { ApplicationCommandOptionType, ApplicationCommandType, Routes } from "discord-api-types/v10";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { createCommand } from "#/base/command/command_func";
import { CommandMiddleware } from "#/base/command/command_middleware";
import {
  createMockAutocompleteInteraction,
  createMockChatInputInteraction,
  createMockClient,
  createMockMessageContextMenuInteraction,
  createMockUserContextMenuInteraction,
} from "#/testing";
import { arcscordErrorCodes } from "#/utils";
import { CommandManager } from "./command_manager.class";

function createMockClientWithManager() {
  const client = createMockClient();
  return { client, manager: new CommandManager(client) };
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

  it("creates or updates global commands without deleting unused commands in create mode", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, {
      registration: {
        global: { commands: "create", unused: "ignore" },
      },
    });
    vi.mocked(client.rest.get)
      .mockResolvedValueOnce([
        {
          id: "cmd_1",
          application_id: "app_1",
          version: "1",
          name: "ping",
          description: "Old ping command",
          type: ApplicationCommandType.ChatInput,
        },
        {
          id: "cmd_unused",
          application_id: "app_1",
          version: "1",
          name: "old",
          description: "Unused command",
          type: ApplicationCommandType.ChatInput,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "cmd_1",
          application_id: "app_1",
          version: "2",
          name: "ping",
          description: "Ping command",
          type: ApplicationCommandType.ChatInput,
        },
        {
          id: "cmd_2",
          application_id: "app_1",
          version: "1",
          name: "profile",
          type: ApplicationCommandType.User,
        },
        {
          id: "cmd_unused",
          application_id: "app_1",
          version: "1",
          name: "old",
          description: "Unused command",
          type: ApplicationCommandType.ChatInput,
        },
      ]);

    const result = await manager.pushGlobalCommands([
      {
        name: "ping",
        description: "Ping command",
        type: ApplicationCommandType.ChatInput,
      },
      {
        name: "profile",
        type: ApplicationCommandType.User,
      },
    ]);

    expect(result[0]).toBeNull();
    expect(client.rest.patch).toHaveBeenCalledWith(
      Routes.applicationCommand("app_1", "cmd_1"),
      {
        body: {
          name: "ping",
          description: "Ping command",
          type: ApplicationCommandType.ChatInput,
        },
      },
    );
    expect(client.rest.post).toHaveBeenCalledWith(
      Routes.applicationCommands("app_1"),
      {
        body: {
          name: "profile",
          type: ApplicationCommandType.User,
        },
      },
    );
    expect(client.rest.delete).not.toHaveBeenCalled();
    expect(client.rest.put).not.toHaveBeenCalled();
  });

  it("warns about missing, changed, and unused commands without mutating in warn mode", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, {
      registration: {
        global: { commands: "warn", unused: "warn" },
      },
    });
    vi.mocked(client.rest.get).mockResolvedValue([
      {
        id: "cmd_1",
        application_id: "app_1",
        version: "1",
        name: "ping",
        description: "Old ping command",
        type: ApplicationCommandType.ChatInput,
      },
      {
        id: "cmd_unused",
        application_id: "app_1",
        version: "1",
        name: "old",
        description: "Unused command",
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    const result = await manager.pushGlobalCommands([
      {
        name: "ping",
        description: "Ping command",
        type: ApplicationCommandType.ChatInput,
      },
      {
        name: "profile",
        type: ApplicationCommandType.User,
      },
    ]);

    expect(result[0]).toBeNull();
    expect(manager.logger.warn).toHaveBeenCalledTimes(3);
    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("differs"));
    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("missing"));
    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("Unused"));
    expect(client.rest.put).not.toHaveBeenCalled();
    expect(client.rest.post).not.toHaveBeenCalled();
    expect(client.rest.patch).not.toHaveBeenCalled();
    expect(client.rest.delete).not.toHaveBeenCalled();
  });

  it("does not warn when localized command payloads match explicitly", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, {
      registration: {
        global: { commands: "warn", unused: "ignore" },
      },
    });
    vi.mocked(client.rest.get).mockResolvedValue([
      {
        id: "cmd_1",
        application_id: "app_1",
        version: "1",
        name: "ping",
        name_localizations: { fr: "ping" },
        description: "Ping command",
        description_localizations: { fr: "Commande ping" },
        dm_permission: true,
        nsfw: false,
        type: ApplicationCommandType.ChatInput,
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "topic",
            description: "Topic",
            required: false,
            autocomplete: false,
          },
        ],
      },
    ]);

    const result = await manager.pushGlobalCommands([
      {
        name: "ping",
        name_localizations: { fr: "ping" },
        description: "Ping command",
        description_localizations: { fr: "Commande ping" },
        type: ApplicationCommandType.ChatInput,
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "topic",
            description: "Topic",
          },
        ],
      },
    ]);

    expect(result[0]).toBeNull();
    expect(manager.logger.warn).not.toHaveBeenCalled();
  });

  it("does not warn for Discord default context menu fields", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, {
      registration: {
        global: { commands: "warn", unused: "ignore" },
      },
    });
    vi.mocked(client.rest.get).mockResolvedValue([
      {
        id: "cmd_1",
        application_id: "app_1",
        version: "1",
        name: "avatar",
        description: "",
        dm_permission: true,
        nsfw: false,
        type: ApplicationCommandType.User,
      },
    ]);

    const result = await manager.pushGlobalCommands([
      {
        name: "avatar",
        type: ApplicationCommandType.User,
      },
    ]);

    expect(result[0]).toBeNull();
    expect(manager.logger.warn).not.toHaveBeenCalled();
  });

  it("does not warn when explicit integration types match in a different order", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, {
      registration: {
        global: { commands: "warn", unused: "ignore" },
      },
    });
    vi.mocked(client.rest.get).mockResolvedValue([
      {
        id: "cmd_1",
        application_id: "app_1",
        version: "1",
        name: "avatar",
        description: "Avatar command",
        integration_types: [1, 0],
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    const result = await manager.pushGlobalCommands([
      {
        name: "avatar",
        description: "Avatar command",
        integration_types: [0, 1],
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    expect(result[0]).toBeNull();
    expect(manager.logger.warn).not.toHaveBeenCalled();
  });

  it("warns when localized command payloads differ", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, {
      registration: {
        global: { commands: "warn", unused: "ignore" },
      },
    });
    vi.mocked(client.rest.get).mockResolvedValue([
      {
        id: "cmd_1",
        application_id: "app_1",
        version: "1",
        name: "ping",
        name_localizations: { fr: "ping" },
        description: "Ping command",
        description_localizations: { fr: "Ancienne commande ping" },
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    const result = await manager.pushGlobalCommands([
      {
        name: "ping",
        name_localizations: { fr: "ping" },
        description: "Ping command",
        description_localizations: { fr: "Commande ping" },
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    expect(result[0]).toBeNull();
    expect(manager.logger.warn).toHaveBeenCalledOnce();
    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("differs"));
  });

  it("deletes unused guild commands when unused mode is delete without overwriting the guild scope", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, {
      registration: {
        guild: { commands: "ignore", unused: "delete" },
      },
    });
    vi.mocked(client.rest.get)
      .mockResolvedValueOnce([
        {
          id: "cmd_1",
          application_id: "app_1",
          guild_id: "guild_1",
          version: "1",
          name: "ping",
          description: "Ping command",
          type: ApplicationCommandType.ChatInput,
        },
        {
          id: "cmd_unused",
          application_id: "app_1",
          guild_id: "guild_1",
          version: "1",
          name: "old",
          description: "Unused command",
          type: ApplicationCommandType.ChatInput,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "cmd_1",
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
    expect(client.rest.delete).toHaveBeenCalledWith(
      Routes.applicationGuildCommand("app_1", "guild_1", "cmd_unused"),
    );
    expect(client.rest.put).not.toHaveBeenCalled();
  });

  it("uses different registration settings for global and guild scopes", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, {
      registration: {
        global: { commands: "ignore", unused: "ignore" },
        guild: { commands: "warn", unused: "ignore" },
      },
    });
    vi.mocked(client.rest.get).mockResolvedValue([]);

    await manager.pushGlobalCommands([
      {
        name: "ping",
        description: "Ping command",
        type: ApplicationCommandType.ChatInput,
      },
    ]);
    await manager.pushGuildCommands("guild_1", [
      {
        name: "ping",
        description: "Ping command",
        type: ApplicationCommandType.ChatInput,
      },
    ]);

    expect(manager.logger.warn).toHaveBeenCalledOnce();
    expect(manager.logger.warn).toHaveBeenCalledWith(expect.stringContaining("missing"));
  });

  it("dispatches autocomplete interactions to the focused option handler", async () => {
    const { manager } = createMockClientWithManager();
    const animeHandler = vi.fn(ctx => ctx.sendChoices(["Naruto"]));
    const yearHandler = vi.fn(ctx => ctx.sendChoices([2002]));
    const command = createCommand({
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
      autocomplete: {
        anime: animeHandler,
        year: yearHandler,
      },
      run: ctx => ctx.ok(),
    });

    manager.commands.set("cmd_1_search", command);

    const { interaction, respond } = createMockAutocompleteInteraction({
      commandId: "cmd_1",
      commandName: "search",
      focusedOption: { name: "anime", value: "Nar", type: ApplicationCommandOptionType.String },
    });

    const autocompleteManager = manager as unknown as {
      handleAutocomplete: (interaction: AutocompleteInteraction) => Promise<void>;
    };

    await autocompleteManager.handleAutocomplete(interaction);

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
      run: vi.fn(),
    } as unknown as Command;

    const [err] = manager.loadCommands([invalidCommand]);

    expect(err?.message).toBe("missing autocomplete handler for option \"anime\" in command \"search\"");
  });

  it("rejects autocomplete handlers that do not match enabled options when loading commands", () => {
    const { manager } = createMockClientWithManager();
    const invalidCommand = {
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
          name: "anime",
          description: "Search anime",
          options: {
            query: {
              type: "string",
              description: "Anime name",
              autocomplete: true,
            },
          },
          run: vi.fn(),
        },
      ],
    } as unknown as Command;

    const [err] = manager.loadCommands([invalidCommand]);

    expect(err?.message).toBe("missing autocomplete handler for option \"query\" in command \"search.anime\"");
  });

  it("rejects duplicate middleware names when loading commands", () => {
    const { manager } = createMockClientWithManager();
    class DuplicateMiddleware extends CommandMiddleware {
      readonly name = "duplicate" as const;
      run(): CommandMiddlewareRun<{ valid: true }> {
        return this.next({ valid: true });
      }
    }
    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      use: [new DuplicateMiddleware(), new DuplicateMiddleware()],
      run: ctx => ctx.ok(),
    });

    const [err] = manager.loadCommands([command]);

    expect(err).toMatchObject({
      code: arcscordErrorCodes.CommandValidationFailed,
      message: "duplicate middleware name \"duplicate\" in command \"ping\"",
      metadata: {
        rule: "unique-middleware-name",
        middlewareName: "duplicate",
        commandName: "ping",
        group: "globalCommands",
      },
    });
  });

  it("rejects duplicate middleware names when loading subcommands", () => {
    const { manager } = createMockClientWithManager();
    class DuplicateMiddleware extends CommandMiddleware {
      readonly name = "duplicate" as const;
      run(): CommandMiddlewareRun<{ valid: true }> {
        return this.next({ valid: true });
      }
    }
    const command = {
      name: "tools",
      description: "Tools",
      subCommands: [{
        name: "ping",
        description: "Ping",
        use: [new DuplicateMiddleware(), new DuplicateMiddleware()],
        run: vi.fn(),
      }],
    } as unknown as Command;

    const [err] = manager.loadCommands([command]);

    expect(err).toMatchObject({
      code: arcscordErrorCodes.CommandValidationFailed,
      message: "duplicate middleware name \"duplicate\" in command \"tools.ping\"",
      metadata: {
        commandName: "tools.ping",
        group: "globalCommands",
      },
    });
  });

  it("passes status returned when run() returns ok", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: ctx => ctx.ok(),
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockChatInputInteraction(),
    );

    expect(resultHandler).toHaveBeenCalledOnce();
    expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("success");
    expect(resultHandler.mock.calls[0]?.[0].exit.value).toBe(true);
  });

  it("passes the owning manager as the second argument to resultHandler", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: ctx => ctx.ok(),
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockChatInputInteraction(),
    );

    expect(resultHandler.mock.calls[0]?.[1]).toBe(managerWithOptions);
  });

  it("lets a custom resultHandler delegate to manager.defaultResultHandler", async () => {
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, {
      resultHandler: (infos, manager) => manager.defaultResultHandler(infos),
    });
    const defaultSpy = vi.spyOn(managerWithOptions, "defaultResultHandler");

    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: ctx => ctx.ok(),
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockChatInputInteraction(),
    );

    expect(defaultSpy).toHaveBeenCalledOnce();
    expect(defaultSpy.mock.calls[0]?.[0].exit.status).toBe("success");
  });

  it("awaits and logs a rejected resultHandler without running it twice", async () => {
    const handlerError = new Error("result handler boom");
    const resultHandler = vi.fn().mockRejectedValue(handlerError);
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: ctx => ctx.ok(),
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await expect((managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockChatInputInteraction(),
    )).resolves.toBeUndefined();

    expect(resultHandler).toHaveBeenCalledOnce();
    expect(managerWithOptions.logger.logError).toHaveBeenCalledWith(
      handlerError,
      { source: "resultHandler" },
    );
  });

  it("passes status thrown and preserves the raw thrown value", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const thrown = new Error("boom");
    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: () => {
        throw thrown;
      },
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockChatInputInteraction(),
    );

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.exit.status).toBe("defect");
    expect(infos.exit.defect).toBe(thrown);
    expect("result" in infos).toBe(false);
  });

  it("normalizes void run() return to ok(true) in resultHandler", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: () => {},
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockChatInputInteraction(),
    );

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.exit.status).toBe("success");
    expect(infos.exit.value).toBe(true);
  });

  it("normalizes string run() return to ok(string) in resultHandler", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const command = createCommand({
      slash: { name: "ping", description: "Ping" },
      run: () => "pong!",
    });
    managerWithOptions.commands.set("cmd_1_ping", command);

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
      createMockChatInputInteraction(),
    );

    const infos = resultHandler.mock.calls[0]?.[0];
    expect(infos.exit.status).toBe("success");
    expect(infos.exit.value).toBe("pong!");
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

    const interaction = createMockChatInputInteraction();
    (interaction as unknown as Record<string, unknown>).command = null;

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(resultHandler).not.toHaveBeenCalled();
    expect(managerWithOptions.logger.warn).toHaveBeenCalled();
  });

  it("dispatches user context menu interaction to run()", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const run = vi.fn(ctx => ctx.ok());
    const command = createCommand({
      user: { name: "Profile" },
      run,
    });
    managerWithOptions.commands.set("cmd_1_Profile", command);

    const interaction = createMockUserContextMenuInteraction({
      commandId: "cmd_1",
      commandName: "Profile",
      targetUser: { id: "target_1" },
    });

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(run).toHaveBeenCalledOnce();
    expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("success");
  });

  it("dispatches message context menu interaction to run()", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const managerWithOptions = new CommandManager(client, { resultHandler });

    const run = vi.fn(ctx => ctx.ok());
    const command = createCommand({
      message: { name: "Info" },
      run,
    });
    managerWithOptions.commands.set("cmd_1_Info", command);

    const interaction = createMockMessageContextMenuInteraction({
      commandId: "cmd_1",
      commandName: "Info",
      targetMessage: { id: "msg_1" } as never,
    });

    await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(run).toHaveBeenCalledOnce();
    expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("success");
  });

  describe("full interactionCreate pipeline (via client.on)", () => {
    it("dispatches a chat input interaction emitted on the client through to resultHandler", async () => {
      const resultHandler = vi.fn();
      const client = createMockClient();
      const manager = new CommandManager(client, { resultHandler });

      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        run: ctx => ctx.ok(),
      });
      manager.commands.set("cmd_1_ping", command);

      await client._emitMock("interactionCreate", createMockChatInputInteraction());
      await vi.waitFor(() => expect(resultHandler).toHaveBeenCalledOnce());

      expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("success");
    });

    it("dispatches an autocomplete interaction emitted on the client to the focused option handler", async () => {
      const client = createMockClient();
      const manager = new CommandManager(client);

      const animeHandler = vi.fn(ctx => ctx.sendChoices(["Naruto"]));
      const command = createCommand({
        slash: {
          name: "search",
          description: "Search anime",
          options: {
            anime: { type: "string", description: "Anime name", autocomplete: true },
          },
        },
        autocomplete: { anime: animeHandler },
        run: ctx => ctx.ok(),
      });
      manager.commands.set("cmd_1_search", command);

      const { interaction, respond } = createMockAutocompleteInteraction({
        commandId: "cmd_1",
        commandName: "search",
        focusedOption: { name: "anime", value: "Nar", type: ApplicationCommandOptionType.String },
      });

      await client._emitMock("interactionCreate", interaction);
      await vi.waitFor(() => expect(respond).toHaveBeenCalled());

      expect(animeHandler).toHaveBeenCalledOnce();
    });

    it("dispatches a user context menu interaction emitted on the client to run()", async () => {
      const client = createMockClient();
      const manager = new CommandManager(client);

      const run = vi.fn(ctx => ctx.ok());
      const command = createCommand({ user: { name: "Profile" }, run });
      manager.commands.set("cmd_1_Profile", command);

      await client._emitMock("interactionCreate", createMockUserContextMenuInteraction({
        commandId: "cmd_1",
        commandName: "Profile",
      }));
      await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
    });
  });

  describe("middleware pipeline", () => {
    class FirstMiddleware extends CommandMiddleware {
      readonly name = "first" as const;
      run(): CommandMiddlewareRun<{ step: 1 }> {
        return this.next({ step: 1 });
      }
    }

    class SecondMiddleware extends CommandMiddleware {
      readonly name = "second" as const;
      run(): CommandMiddlewareRun<{ step: 2 }> {
        return this.next({ step: 2 });
      }
    }

    class CancelThirdMiddleware extends CommandMiddleware {
      readonly name = "third" as const;
      run(): CommandMiddlewareRun<NonNullable<unknown>> {
        return this.cancel(ok(true));
      }
    }

    class ErrorThirdMiddleware extends CommandMiddleware {
      readonly name = "third" as const;
      run(_ctx: CommandContext): CommandMiddlewareRun<NonNullable<unknown>> {
        return this.fail(new Error("third failed"));
      }
    }

    it("accumulates next() values from multiple middlewares into context.additional before run()", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const run = vi.fn((ctx: CommandContext) => {
        expect(ctx.additional).toEqual({ first: { step: 1 }, second: { step: 2 } });
        return ctx.ok();
      });
      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        use: [new FirstMiddleware(), new SecondMiddleware()],
        run,
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
        createMockChatInputInteraction(),
      );

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("success");
    });

    it("stops the pipeline without calling run() or resultHandler when a middleware cancels", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const run = vi.fn(ctx => ctx.ok());
      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        use: [new FirstMiddleware(), new SecondMiddleware(), new CancelThirdMiddleware()],
        run,
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
        createMockChatInputInteraction(),
      );

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
    });

    it("passes status thrown with the middleware's ArcscordError when a middleware in the chain errors", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const run = vi.fn(ctx => ctx.ok());
      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        use: [new FirstMiddleware(), new SecondMiddleware(), new ErrorThirdMiddleware()],
        run,
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
        createMockChatInputInteraction(),
      );

      expect(run).not.toHaveBeenCalled();
      const infos = resultHandler.mock.calls[0]?.[0];
      expect(infos.exit.status).toBe("failure");
      expect(infos.exit.failure).toBeInstanceOf(Error);
      expect(infos.exit.failure.message).toBe("third failed");
    });

    it("wraps a thrown exception from a middleware into a ArcscordError with status thrown", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      class ThrowingMiddleware extends CommandMiddleware {
        readonly name = "throwing" as const;
        run(): never {
          throw new Error("middleware boom");
        }
      }

      const run = vi.fn(ctx => ctx.ok());
      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        use: [new ThrowingMiddleware()],
        run,
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
        createMockChatInputInteraction(),
      );

      expect(run).not.toHaveBeenCalled();
      const infos = resultHandler.mock.calls[0]?.[0];
      expect(infos.exit.status).toBe("defect");
      expect(infos.exit.defect).toBeInstanceOf(Error);
      expect(infos.exit.defect.message).toBe("middleware boom");
    });
  });

  describe("run() throwing non-Error values", () => {
    const nonErrorThrows: [string, unknown][] = [
      ["a string", "boom string"],
      ["null", null],
      ["a plain object", { code: 42 }],
    ];

    it.each(nonErrorThrows)("preserves %s thrown from run() as a defect", async (_label, thrown) => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        run: () => {
          throw thrown;
        },
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
        createMockChatInputInteraction(),
      );

      const infos = resultHandler.mock.calls[0]?.[0];
      expect(infos.exit.status).toBe("defect");
      expect(infos.exit.defect).toBe(thrown);
    });
  });

  describe("preReply / deferReply", () => {
    it("defers the reply before running the command when preReply is true", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const run = vi.fn((ctx: CommandContext) => {
        expect(ctx.defer).toBe(true);
        return ctx.ok();
      });
      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        preReply: true,
        run,
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      const interaction = createMockChatInputInteraction();
      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: undefined });
      expect(run).toHaveBeenCalledOnce();
    });

    it("defers with the ephemeral flag when preReply is \"ephemeral\"", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        preReply: "ephemeral",
        run: ctx => ctx.ok(),
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      const interaction = createMockChatInputInteraction();
      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    });

    it("stops the pipeline and applies deferFailed diagnostics when deferReply fails", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const run = vi.fn(ctx => ctx.ok());
      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        preReply: true,
        run,
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      const interaction = createMockChatInputInteraction();
      vi.mocked(interaction.deferReply).mockRejectedValue(new Error("defer boom"));

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(managerWithOptions.logger.warn).toHaveBeenCalled();
    });

    it("uses editReply instead of reply for the default resultHandler when defer is true", async () => {
      const { manager } = createMockClientWithManager();

      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        preReply: true,
        run: () => {
          throw new Error("boom");
        },
      });
      manager.commands.set("cmd_1_ping", command);

      const interaction = createMockChatInputInteraction();
      await (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(interaction.deferReply).toHaveBeenCalledOnce();
      expect(interaction.editReply).toHaveBeenCalledOnce();
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("uses reply for the default resultHandler when there was no defer", async () => {
      const { manager } = createMockClientWithManager();

      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        run: () => {
          throw new Error("boom");
        },
      });
      manager.commands.set("cmd_1_ping", command);

      const interaction = createMockChatInputInteraction();
      await (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(interaction.reply).toHaveBeenCalledOnce();
      expect(interaction.editReply).not.toHaveBeenCalled();
    });
  });

  describe("required option validation", () => {
    it("rejects a missing required string option before run() is called", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const run = vi.fn(ctx => ctx.ok());
      const command = createCommand({
        slash: {
          name: "greet",
          description: "Greet",
          options: {
            name: { type: "string", description: "Name", required: true },
          },
        },
        run,
      });
      managerWithOptions.commands.set("cmd_1_greet", command);

      const interaction = createMockChatInputInteraction({ commandName: "greet" });
      ((interaction as unknown as Record<string, unknown>).options as Record<string, unknown>).getString = vi.fn(() => null);

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(managerWithOptions.logger.logError).toHaveBeenCalledOnce();
      expect(managerWithOptions.logger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: arcscordErrorCodes.CommandOptionParsingFailed,
        }),
        expect.objectContaining({ incidentId: expect.any(String) }),
      );
    });

    it("applies the optionParsingFailed diagnostic configuration", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, {
        resultHandler,
        dispatchDiagnostics: {
          optionParsingFailed: { level: "warn", reply: false },
        },
      });
      const run = vi.fn(ctx => ctx.ok());
      const command = createCommand({
        slash: {
          name: "greet",
          description: "Greet",
          options: {
            name: { type: "string", description: "Name", required: true },
          },
        },
        run,
      });
      managerWithOptions.commands.set("cmd_1_greet", command);

      const interaction = createMockChatInputInteraction({ commandName: "greet" });
      ((interaction as unknown as Record<string, unknown>).options as Record<string, unknown>).getString = vi.fn(() => null);

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(managerWithOptions.logger.warn).toHaveBeenCalledWith(
        "Option name is required but was not provided.",
        expect.objectContaining({ incidentId: expect.any(String) }),
      );
      expect(interaction.reply).not.toHaveBeenCalled();
    });
  });

  describe("locale detection", () => {
    it("passes the detected locale through to run() and resultHandler", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      vi.mocked(client.localeManager.detectLanguage).mockResolvedValue("fr");
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const run = vi.fn((ctx: CommandContext) => {
        expect(ctx.locale).toBe("fr");
        return ctx.ok();
      });
      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        run,
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(
        createMockChatInputInteraction(),
      );

      expect(run).toHaveBeenCalledOnce();
      expect(resultHandler.mock.calls[0]?.[0].locale).toBe("fr");
    });
  });

  describe("unrecognized interaction type", () => {
    it("applies contextCreationFailed diagnostics when no known command interaction predicate matches", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, { resultHandler });

      const run = vi.fn(ctx => ctx.ok());
      const command = createCommand({
        slash: { name: "ping", description: "Ping" },
        run,
      });
      managerWithOptions.commands.set("cmd_1_ping", command);

      const interaction = createMockChatInputInteraction();
      (interaction as unknown as Record<string, unknown>).isChatInputCommand = () => false;

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(run).not.toHaveBeenCalled();
      expect(resultHandler).not.toHaveBeenCalled();
      expect(managerWithOptions.logger.logError).toHaveBeenCalledOnce();
    });
  });

  describe("dispatch diagnostics levels", () => {
    it("logs at error level (and generates an id) when commandNotFound level is \"error\"", async () => {
      const resultHandler = vi.fn();
      const { client } = createMockClientWithManager();
      const managerWithOptions = new CommandManager(client, {
        resultHandler,
        dispatchDiagnostics: {
          commandNotFound: { level: "error", reply: false },
        },
      });

      const interaction = createMockChatInputInteraction();
      (interaction as unknown as Record<string, unknown>).command = null;

      await (managerWithOptions as unknown as ExposedHandleInteraction).handleInteraction(interaction);

      expect(resultHandler).not.toHaveBeenCalled();
      expect(managerWithOptions.logger.logError).toHaveBeenCalled();
    });
  });
});
