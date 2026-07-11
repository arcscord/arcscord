import type { AutocompleteInteraction, CommandInteraction } from "discord.js";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { describe, expect, it, vi } from "vitest";
import { createCommandWithSubs, createSubCommand } from "#/base/command/command_func";
import {
  createMockAutocompleteInteraction,
  createMockChatInputInteraction,
  createMockClient,
} from "#/testing";
import { CommandManager } from "./command_manager.class";

function createMockClientWithManager() {
  const client = createMockClient();
  return { client, manager: new CommandManager(client) };
}

type ExposedHandleInteraction = { handleInteraction: (interaction: CommandInteraction) => Promise<void> };
type ExposedHandleAutocomplete = { handleAutocomplete: (interaction: AutocompleteInteraction) => Promise<void> };

describe("command manager subcommands", () => {
  it("resolves and runs a top-level subcommand", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, { resultHandler });

    const pingRun = vi.fn(ctx => ctx.ok());
    const banRun = vi.fn(ctx => ctx.ok());
    const command = createCommandWithSubs({
      name: "utils",
      description: "Utils",
      subCommands: [
        createSubCommand({ name: "ping", description: "Ping", run: pingRun }),
        createSubCommand({ name: "ban", description: "Ban", run: banRun }),
      ],
    });
    manager.commands.set("cmd_1_utils", command);

    const interaction = createMockChatInputInteraction({
      commandName: "utils",
      options: { getSubcommand: () => "ping" },
    });

    await (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(pingRun).toHaveBeenCalledOnce();
    expect(banRun).not.toHaveBeenCalled();
    expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("success");
  });

  it("resolves and runs a subcommand nested in a subcommand group", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, { resultHandler });

    const banRun = vi.fn(ctx => ctx.ok());
    const command = createCommandWithSubs({
      name: "admin",
      description: "Admin",
      subCommandsGroups: {
        user: {
          description: "User management",
          subCommands: [
            createSubCommand({ name: "ban", description: "Ban a user", run: banRun }),
          ],
        },
      },
    });
    manager.commands.set("cmd_1_admin", command);

    const interaction = createMockChatInputInteraction({
      commandName: "admin",
      options: {
        getSubcommand: () => "ban",
        getSubcommandGroup: () => "user",
      },
    });

    await (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(banRun).toHaveBeenCalledOnce();
    expect(resultHandler.mock.calls[0]?.[0].exit.status).toBe("success");
  });

  it("applies commandNotFound diagnostics when the interaction carries no subcommand name", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, { resultHandler });

    const run = vi.fn(ctx => ctx.ok());
    const command = createCommandWithSubs({
      name: "utils",
      description: "Utils",
      subCommands: [createSubCommand({ name: "ping", description: "Ping", run })],
    });
    manager.commands.set("cmd_1_utils", command);

    const interaction = createMockChatInputInteraction({
      commandName: "utils",
      options: { getSubcommand: () => null },
    });

    await (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(run).not.toHaveBeenCalled();
    expect(resultHandler).not.toHaveBeenCalled();
    expect(manager.logger.logError).toHaveBeenCalledOnce();
  });

  it("rejects an interaction type that cannot carry a subcommand (e.g. a user context menu)", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, { resultHandler });

    const run = vi.fn(ctx => ctx.ok());
    const command = createCommandWithSubs({
      name: "utils",
      description: "Utils",
      subCommands: [createSubCommand({ name: "ping", description: "Ping", run })],
    });
    manager.commands.set("cmd_1_utils", command);

    const interaction = createMockChatInputInteraction({ commandName: "utils" });
    (interaction as unknown as Record<string, unknown>).isChatInputCommand = () => false;
    (interaction as unknown as Record<string, unknown>).isAutocomplete = () => false;

    await (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(run).not.toHaveBeenCalled();
    expect(resultHandler).not.toHaveBeenCalled();
    expect(manager.logger.logError).toHaveBeenCalledOnce();
  });

  it("applies commandNotFound diagnostics when the named subcommand does not exist", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, { resultHandler });

    const run = vi.fn(ctx => ctx.ok());
    const command = createCommandWithSubs({
      name: "utils",
      description: "Utils",
      subCommands: [createSubCommand({ name: "ping", description: "Ping", run })],
    });
    manager.commands.set("cmd_1_utils", command);

    const interaction = createMockChatInputInteraction({
      commandName: "utils",
      options: { getSubcommand: () => "unknown-subcommand" },
    });

    await (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction);

    expect(run).not.toHaveBeenCalled();
    expect(resultHandler).not.toHaveBeenCalled();
    expect(manager.logger.logError).toHaveBeenCalledOnce();
  });

  it("applies commandNotFound diagnostics for a mistyped/unknown subcommand group", async () => {
    const resultHandler = vi.fn();
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client, { resultHandler });

    const banRun = vi.fn(ctx => ctx.ok());
    const command = createCommandWithSubs({
      name: "admin",
      description: "Admin",
      subCommandsGroups: {
        user: {
          description: "User management",
          subCommands: [createSubCommand({ name: "ban", description: "Ban a user", run: banRun })],
        },
      },
    });
    manager.commands.set("cmd_1_admin", command);

    const interaction = createMockChatInputInteraction({
      commandName: "admin",
      options: {
        getSubcommand: () => "ban",
        getSubcommandGroup: () => "unknown-group",
      },
    });

    await expect(
      (manager as unknown as ExposedHandleInteraction).handleInteraction(interaction),
    ).resolves.toBeUndefined();

    expect(banRun).not.toHaveBeenCalled();
    expect(resultHandler).not.toHaveBeenCalled();
    expect(manager.logger.logError).toHaveBeenCalledOnce();
  });

  it("dispatches autocomplete for an option on a subcommand to its handler", async () => {
    const { client } = createMockClientWithManager();
    const manager = new CommandManager(client);

    const queryHandler = vi.fn(ctx => ctx.sendChoices(["hello"]));
    const command = createCommandWithSubs({
      name: "search",
      description: "Search",
      subCommands: [
        createSubCommand({
          name: "text",
          description: "Search text",
          options: {
            query: { type: "string", description: "Query", autocomplete: true },
          },
          autocomplete: { query: queryHandler },
          run: vi.fn(ctx => ctx.ok()),
        }),
      ],
    });
    manager.commands.set("cmd_1_search", command);

    const { interaction, respond } = createMockAutocompleteInteraction({
      commandId: "cmd_1",
      commandName: "search",
      focusedOption: { name: "query", value: "he", type: ApplicationCommandOptionType.String },
      getSubcommand: () => "text",
    });

    await (manager as unknown as ExposedHandleAutocomplete).handleAutocomplete(interaction);

    expect(queryHandler).toHaveBeenCalledOnce();
    expect(respond).toHaveBeenCalledWith([{ name: "hello", value: "hello" }]);
  });
});
