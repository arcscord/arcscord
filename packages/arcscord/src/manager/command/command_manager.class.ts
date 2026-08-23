import type { Result } from "@arcscord/error";
import type {
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type {
  AutocompleteInteraction,
  CommandInteraction,
} from "discord.js";
import type { AnyCommandHandler, AnySubCommandHandler, ArcClient } from "#/base";
import type {
  CommandContext,
  PartialCommandDefinitionForSlash,
  SlashCommandContextBuilderOptions,
} from "#/base/command";
import type {
  Command,
  SlashWithSubsCommandDefinition,
  SubCommandDefinition,
} from "#/base/command/command_definition.type";
import type { Option, OptionsList } from "#/base/command/option.type";
import type {
  CommandExecutionContext,
  CommandExecutionHandler,
  CommandExecutionOutcome,
  CommandManagerOptions,
  CommandResultHandler,
  CommandResultHandlerImplementer,
  CommandResultHandlerInfos,
} from "#/manager/command/command_manager.type";
import type { CommandRegistrationConfig } from "#/manager/command/command_registration";
import type { ExecutionExit } from "#/utils/error/execution_exit";
import type { ApplicationCommandRegistration } from "./command_registration";
import { anyToError, error, ok } from "@arcscord/error";
import { ApplicationCommandType } from "discord-api-types/v10";
import { MessageFlags } from "discord.js";
import {
  AutocompleteContext,
  hasAutocomplete,
  hasMessageCommand,
  hasSlashCommand,
  hasUserCommand,
  isSubCommand,
  MessageCommandContext,
  SlashCommandContext,
  UserCommandContext,
} from "#/base/command";
import { commandToAPI, subCommandListToAPI } from "#/base/command/command_transformer";
import { parseOptions } from "#/base/command/option_parser";
import { createExecutionControls } from "#/base/manager/execution_handler";
import { BaseManager } from "#/base/manager/manager.class";
import { diagnosticTiming, managerDiagnosticChannels } from "#/manager/diagnostics";
import {
  ArcscordError,
  arcscordErrorCodes,
  executionDefect,
  executionFailure,
  executionSuccess,
  isArcscordError,
  normalizeHandlerReturn,
  validateCommands,
} from "#/utils";
import { applyDiagnosticLevel } from "#/utils/error/run_normalize";
import { validateCommandMiddlewareNames } from "#/utils/validator/middleware_validator";
import {
  commandResultHandlerAdapter,
  defaultCommandExecutionHandler,
  runDefaultCommandExecution,
} from "./command_execution_handler";
import {
  normalizeCommandRegistrationConfig,
  registerCommands,
} from "./command_registration";

type NormalizedCommandManagerOptions = {
  executionHandlers: readonly CommandExecutionHandler[];
  resultHandler: CommandResultHandler;
  registration: Required<CommandRegistrationConfig>;
  dispatchDiagnostics: NonNullable<CommandManagerOptions["dispatchDiagnostics"]>;
};

/**
 * The `CommandManager` class is responsible for managing commands;
 */
export class CommandManager
  extends BaseManager
  implements CommandResultHandlerImplementer {
  commands: Map<string, Command> = new Map();

  options: NormalizedCommandManagerOptions;

  constructor(client: ArcClient, options?: CommandManagerOptions) {
    super(client, "command");

    if (options?.executionHandlers !== undefined && options.resultHandler !== undefined) {
      throw new TypeError("command executionHandlers and resultHandler are mutually exclusive");
    }

    const executionHandlers = options?.executionHandlers
      ?? (options?.resultHandler
        ? [commandResultHandlerAdapter(options.resultHandler)]
        : [defaultCommandExecutionHandler]);

    this.options = {
      dispatchDiagnostics: {},
      ...options,
      executionHandlers,
      resultHandler: options?.resultHandler ?? this.defaultResultHandler.bind(this),
      registration: normalizeCommandRegistrationConfig(options?.registration),
    };

    this.client.on("interactionCreate", (interaction) => {
      if (interaction.isCommand()) {
        void this.handleInteraction(interaction);
      }
      if (interaction.isAutocomplete()) {
        void this.handleAutocomplete(interaction);
      }
    });
  }

  /**
   * Loads commands into the application and categorizes them into slash, message, and user commands.
   *
   * @param commands - The array of command definitions to load.
   * @param group - The group name for logging purposes.
   * @return The array of API application commands.
   */
  loadCommands(
    commands: Command[],
    group = "globalCommands",
  ): Result<RESTPostAPIApplicationCommandsJSONBody[], ArcscordError> {
    const diagnostic = managerDiagnosticChannels.command.load.hasSubscribers;
    const operationId = diagnostic ? Symbol("arcscord:manager:command:load") : undefined;
    const startedAt = diagnostic ? Date.now() : 0;
    if (diagnostic) {
      managerDiagnosticChannels.command.load.publish({
        phase: "start",
        manager: this,
        client: this.client,
        timestamp: startedAt,
        operationId: operationId!,
        startedAt,
        commands,
        group,
      });
    }

    const fail = (err: ArcscordError): Result<RESTPostAPIApplicationCommandsJSONBody[], ArcscordError> => {
      if (diagnostic && managerDiagnosticChannels.command.load.hasSubscribers) {
        managerDiagnosticChannels.command.load.publish({
          phase: "error",
          manager: this,
          client: this.client,
          timestamp: Date.now(),
          operationId: operationId!,
          commands,
          group,
          error: err,
        });
      }
      return error(err);
    };

    const [commandsValidationErr] = validateCommands(commands, this.client, {
      group,
    });
    if (commandsValidationErr !== null) {
      return fail(commandsValidationErr);
    }

    const commandsBody: RESTPostAPIApplicationCommandsJSONBody[] = [];
    let totalCommands = 0;
    let slashCommands = 0;
    let messageCommands = 0;
    let userCommands = 0;

    for (const command of commands) {
      if (!isSubCommand(command)) {
        const commandName = command.slash?.name ?? command.message?.name ?? command.user?.name ?? "unknown";
        const [middlewareValidationErr] = validateCommandMiddlewareNames(command.use, commandName, group);
        if (middlewareValidationErr !== null) {
          return fail(middlewareValidationErr);
        }

        const [validationErr] = this.validateCommandAutocomplete(command, group);
        if (validationErr !== null) {
          return fail(validationErr);
        }

        let hasPush = false;
        const data = commandToAPI(command, this.client);

        if (data.slash) {
          commandsBody.push(data.slash);
          slashCommands++;
          hasPush = true;
          this.trace(
            `loaded slash builder of command "${data.slash.name}" in group "${group}"`,
          );
        }

        if (data.message) {
          commandsBody.push(data.message);
          messageCommands++;
          hasPush = true;
          this.trace(
            `loaded message builder of command "${data.message.name}" in group "${group}"`,
          );
        }

        if (data.user) {
          commandsBody.push(data.user);
          userCommands++;
          hasPush = true;
          this.trace(
            `loaded user builder of command "${data.user.name}" in group "${group}"`,
          );
        }
        if (!hasPush) {
          return fail(new ArcscordError({
            code: arcscordErrorCodes.CommandValidationFailed,
            message: `no builder found for command "${commandName}" in group "${group}"`,
            metadata: {
              rule: "command-builder-required",
              commandName,
              group,
            },
          }));
        }
        totalCommands++;
      }
      else {
        const [middlewareValidationErr] = this.validateSubCommandListMiddlewareNames(command, group);
        if (middlewareValidationErr !== null) {
          return fail(middlewareValidationErr);
        }

        const [validationErr] = this.validateSubCommandListAutocomplete(command, group);
        if (validationErr !== null) {
          return fail(validationErr);
        }

        commandsBody.push(subCommandListToAPI(command, this.client));
        slashCommands++;
        this.trace(
          `loaded slash builder of command "${command.name}" in group "${group}"`,
        );
      }
    }
    this.trace(
      `loaded ${totalCommands} commands for group ${group} ! (${slashCommands} slash`
      + `, ${messageCommands} message, ${userCommands} user)`,
    );

    if (diagnostic && managerDiagnosticChannels.command.load.hasSubscribers) {
      managerDiagnosticChannels.command.load.publish({
        phase: "end",
        manager: this,
        client: this.client,
        operationId: operationId!,
        ...diagnosticTiming(startedAt),
        commands,
        group,
        apiCommands: commandsBody,
      });
    }
    return ok(commandsBody);
  }

  private validateSubCommandListMiddlewareNames(command: SlashWithSubsCommandDefinition, group: string): Result<true, ArcscordError<"COMMAND_VALIDATION_FAILED">> {
    for (const subCommand of command.subCommands ?? []) {
      const [err] = validateCommandMiddlewareNames(subCommand.use, `${command.name}.${subCommand.name}`, group);
      if (err !== null) {
        return error(err);
      }
    }

    for (const [groupName, subCommandGroup] of Object.entries(command.subCommandsGroups ?? {})) {
      for (const subCommand of subCommandGroup.subCommands) {
        const [err] = validateCommandMiddlewareNames(subCommand.use, `${command.name}.${groupName}.${subCommand.name}`, group);
        if (err !== null) {
          return error(err);
        }
      }
    }

    return ok(true);
  }

  private validateCommandAutocomplete(command: AnyCommandHandler, group: string): Result<true, ArcscordError<"COMMAND_VALIDATION_FAILED">> {
    if (!hasSlashCommand(command) || !command.slash.options) {
      return this.validateAutocompleteHandlers(command.autocomplete, undefined, command.slash?.name ?? command.message?.name ?? command.user?.name ?? "unknown", group);
    }

    return this.validateAutocompleteHandlers(
      command.autocomplete,
      command.slash.options,
      command.slash.name,
      group,
    );
  }

  private validateSubCommandListAutocomplete(command: SlashWithSubsCommandDefinition, group: string): Result<true, ArcscordError<"COMMAND_VALIDATION_FAILED">> {
    for (const subCommand of command.subCommands ?? []) {
      const [err] = this.validateSubCommandAutocomplete(subCommand, subCommand.autocomplete, `${command.name}.${subCommand.name}`, group);
      if (err !== null) {
        return error(err);
      }
    }

    if (command.subCommandsGroups) {
      for (const [groupName, subCommandGroup] of Object.entries(command.subCommandsGroups)) {
        for (const subCommand of subCommandGroup.subCommands) {
          const [err] = this.validateSubCommandAutocomplete(
            subCommand,
            subCommand.autocomplete,
            `${command.name}.${groupName}.${subCommand.name}`,
            group,
          );
          if (err !== null) {
            return error(err);
          }
        }
      }
    }

    return ok(true);
  }

  private validateSubCommandAutocomplete(
    build: SubCommandDefinition,
    handlers: Record<string, unknown> | undefined,
    commandName: string,
    group: string,
  ): Result<true, ArcscordError<"COMMAND_VALIDATION_FAILED">> {
    return this.validateAutocompleteHandlers(handlers, build.options, commandName, group);
  }

  private validateAutocompleteHandlers(
    handlers: Record<string, unknown> | undefined,
    options: OptionsList | undefined,
    commandName: string,
    group: string,
  ): Result<true, ArcscordError<"COMMAND_VALIDATION_FAILED">> {
    const autocompleteOptions = Object.entries(options ?? {})
      .filter(([, option]) => this.isAutocompleteOption(option))
      .map(([name]) => name);
    const handlerNames = Object.keys(handlers ?? {});

    for (const optionName of autocompleteOptions) {
      if (!handlers?.[optionName]) {
        return error(new ArcscordError({
          code: arcscordErrorCodes.CommandValidationFailed,
          message: `missing autocomplete handler for option "${optionName}" in command "${commandName}"`,
          metadata: {
            rule: "autocomplete-handler-required",
            group,
            commandName,
            optionName,
            handlers: handlerNames,
          },
        }));
      }
    }

    for (const handlerName of handlerNames) {
      const option = options?.[handlerName];
      if (!option) {
        return error(new ArcscordError({
          code: arcscordErrorCodes.CommandValidationFailed,
          message: `autocomplete handler "${handlerName}" does not match an option in command "${commandName}"`,
          metadata: {
            rule: "autocomplete-option-required",
            group,
            commandName,
            handlerName,
            options: Object.keys(options ?? {}),
          },
        }));
      }

      if (!this.isAutocompleteOption(option)) {
        return error(new ArcscordError({
          code: arcscordErrorCodes.CommandValidationFailed,
          message: `autocomplete handler "${handlerName}" targets an option without autocomplete enabled in command "${commandName}"`,
          metadata: {
            rule: "autocomplete-enabled",
            group,
            commandName,
            handlerName,
            option,
          },
        }));
      }
    }

    return ok(true);
  }

  private isAutocompleteOption(option: Option): boolean {
    return (
      (option.type === "string" || option.type === "integer" || option.type === "number")
      && "autocomplete" in option
      && option.autocomplete === true
    );
  }

  /**
   * Pushes a set of global commands to the application.
   *
   * @param commands - An array of command data resolvable objects to be registered globally.
   * @return A promise that resolves to a result object containing an array of globally
   *   registered application commands or an error.
   */
  async pushGlobalCommands(
    commands: RESTPostAPIApplicationCommandsJSONBody[],
  ): Promise<Result<ApplicationCommandRegistration[], ArcscordError>> {
    return this.registerCommandsWithDiagnostics("global", commands);
  }

  private async registerCommandsWithDiagnostics(
    scope: "global" | "guild",
    commands: RESTPostAPIApplicationCommandsJSONBody[],
    guildId?: string,
  ): Promise<Result<ApplicationCommandRegistration[], ArcscordError>> {
    const config = this.options.registration[scope];
    const diagnostic = managerDiagnosticChannels.command.register.hasSubscribers;
    const operationId = diagnostic ? Symbol("arcscord:manager:command:register") : undefined;
    const startedAt = diagnostic ? Date.now() : 0;
    if (diagnostic) {
      managerDiagnosticChannels.command.register.publish({
        phase: "start",
        manager: this,
        client: this.client,
        timestamp: startedAt,
        operationId: operationId!,
        startedAt,
        scope,
        guildId,
        config,
        commands,
      });
    }
    const result = await registerCommands({
      client: this.client,
      logger: this.logger,
      scope,
      config,
      commands,
      guildId,
    });
    if (diagnostic && managerDiagnosticChannels.command.register.hasSubscribers) {
      const [err, registrations] = result;
      if (err !== null) {
        managerDiagnosticChannels.command.register.publish({
          phase: "error",
          manager: this,
          client: this.client,
          timestamp: Date.now(),
          operationId: operationId!,
          scope,
          guildId,
          config,
          commands,
          error: err,
        });
      }
      else {
        managerDiagnosticChannels.command.register.publish({
          phase: "end",
          manager: this,
          client: this.client,
          operationId: operationId!,
          ...diagnosticTiming(startedAt),
          scope,
          guildId,
          config,
          commands,
          registrations,
        });
      }
    }
    return result;
  }

  /**
   * Pushes commands to a specific guild.
   *
   * @param guildId - The ID of the guild where commands are being pushed.
   * @param commands - An array of commands data resolvable to be set in the guild.
   * @return A promise that resolves with an array of ApplicationCommands on success.
   */
  async pushGuildCommands(
    guildId: string,
    commands: RESTPostAPIApplicationCommandsJSONBody[],
  ): Promise<Result<ApplicationCommandRegistration[], ArcscordError>> {
    return this.registerCommandsWithDiagnostics("guild", commands, guildId);
  }

  /**
   * Deletes unloaded commands from the application for a specified guild.
   *
   * @param guildId - The ID of the guild from which to remove the commands. If not provided,
   *   global commands are considered.
   * @return A promise that resolves to a result object containing the number of deleted commands or an error.
   */
  async deleteUnloadedCommands(
    guildId?: string,
  ): Promise<Result<number, ArcscordError>> {
    if (!this.client.application) {
      return error(new ArcscordError({
        code: arcscordErrorCodes.ApplicationUnavailable,
        message: "No application found in client",
        metadata: { operation: "deleteUnloadedCommands" },
      }));
    }

    let commands;
    try {
      commands = (
        await this.client.application.commands.fetch({
          guildId,
        })
      ).map(cmd => cmd);
    }
    catch (e) {
      return error(
        new ArcscordError({
          code: arcscordErrorCodes.CommandRegistrationFailed,
          message: "Failed to fetch applications commands",
          metadata: {
            scope: guildId ? "guild" : "global",
            guildId,
            operation: "fetch",
          },
          cause: e,
        }),
      );
    }

    if (commands.length === 0) {
      return ok(0);
    }

    let i = 0;
    for (const command of commands) {
      const name = this.resolveCommandName(command);
      if (!this.commands.has(name)) {
        i++;
        try {
          await this.client.application.commands.delete(command, guildId);
        }
        catch (e) {
          return error(
            new ArcscordError({
              code: arcscordErrorCodes.CommandRegistrationFailed,
              message: "Failed to delete command",
              metadata: {
                scope: guildId ? "guild" : "global",
                guildId,
                operation: "delete",
              },
              cause: e,
            }),
          );
        }
      }
    }

    return ok(i);
  }

  /**
   * Resolves and registers the provided command definitions against the available API commands.
   *
   * @param command - The command definition to be resolved.
   * @param apiCommands - The list of current application commands from the API.
   */
  resolveCommand(
    command: Command,
    apiCommands: ApplicationCommandRegistration[],
  ): void {
    if (!isSubCommand(command)) {
      if (hasSlashCommand(command)) {
        const name = command.slash.name;
        const apiCommand = apiCommands.find(
          cmd =>
            (cmd.type as ApplicationCommandType)
            === ApplicationCommandType.ChatInput && cmd.name === name,
        );

        if (!apiCommand) {
          this.trace(
            `slash command "${command.slash.name}" not found in API`,
          );
        }
        else {
          this.trace(
            `resolve slash command ${command.slash.name} (${apiCommand.id}) !`,
          );
          this.commands.set(this.resolveCommandName(apiCommand), command);
        }
      }

      if (hasMessageCommand(command)) {
        const name = command.message.name;
        const apiCommand = apiCommands.find(
          cmd =>
            (cmd.type as ApplicationCommandType)
            === ApplicationCommandType.Message && cmd.name === name,
        );

        if (!apiCommand) {
          this.trace(
            `message command "${command.message.name}" not found in API`,
          );
        }
        else {
          this.trace(
            `resolve message command ${command.message.name} (${apiCommand.id}) !`,
          );
          this.commands.set(this.resolveCommandName(apiCommand), command);
        }
      }

      if (hasUserCommand(command)) {
        const name = command.user.name;
        const apiCommand = apiCommands.find(
          cmd =>
            (cmd.type as ApplicationCommandType)
            === ApplicationCommandType.User && cmd.name === name,
        );

        if (!apiCommand) {
          this.trace(
            `user command "${command.user.name}" not found in API`,
          );
        }
        else {
          this.trace(
            `resolve user command ${command.user.name} (${apiCommand.id}) !`,
          );
          this.commands.set(this.resolveCommandName(apiCommand), command);
        }
      }
    }
    else {
      const name = command.name;
      const apiCommand = apiCommands.find(
        cmd =>
          (cmd.type as ApplicationCommandType)
          === ApplicationCommandType.ChatInput && cmd.name === name,
      );
      if (!apiCommand) {
        this.trace(`slash command "${name}" not found in API`);
      }
      else {
        this.trace(`resolve slash command ${name} (${apiCommand.id}) !`);
        this.commands.set(this.resolveCommandName(apiCommand), command);
      }
    }

    if (managerDiagnosticChannels.command.resolve.hasSubscribers) {
      const registration = apiCommands.find(apiCommand => (
        this.commands.get(this.resolveCommandName(apiCommand)) === command
      ));
      managerDiagnosticChannels.command.resolve.publish({
        phase: "end",
        manager: this,
        client: this.client,
        timestamp: Date.now(),
        command,
        registration,
        resolvedName: registration ? this.resolveCommandName(registration) : undefined,
      });
    }
  }

  /**
   * Resolves a list of command definitions with the provided application commands.
   *
   * @param commands - The list of command definitions to be resolved.
   * @param apiCommands - The list of existing application commands to resolve against.
   */
  resolveCommands(
    commands: Command[],
    apiCommands: ApplicationCommandRegistration[],
  ): void {
    for (const command of commands) {
      this.resolveCommand(command, apiCommands);
    }
  }

  /**
   * resolve the command name, for always same format in internal work
   *
   * Format : commandId_commandName
   *
   * GuildFormat : g_commandId_commandName
   * @param apiCommand the command to resolve
   */
  resolveCommandName(apiCommand: Pick<ApplicationCommandRegistration, "id" | "name" | "guildId">): string {
    if (apiCommand.guildId) {
      return `g_${apiCommand.id}_${apiCommand.name}`;
    }
    return `${apiCommand.id}_${apiCommand.name}`;
  }

  private getCommand(interaction: CommandInteraction | AutocompleteInteraction): Result<
    {
      cmd: AnyCommandHandler | AnySubCommandHandler;
      resolvedName: string;
    },
    ArcscordError<"COMMAND_NOT_FOUND" | "COMMAND_RESOLUTION_FAILED">
  > {
    const resolvedCommandName = this.resolveCommandName({
      id: interaction.commandId,
      name: interaction.commandName,
      guildId: interaction.commandGuildId,
    });
    const command = this.commands.get(resolvedCommandName);

    if (!command) {
      return error(
        new ArcscordError({
          code: arcscordErrorCodes.CommandNotFound,
          message: `no command found with full id ${resolvedCommandName}`,
          metadata: {
            interactionId: interaction.id,
            commands: this.commands.keys(),
            commandId: interaction.commandId,
            commandName: interaction.commandName,
            commandGuildId: interaction.commandGuildId,
          },
        }),
      );
    }

    if (!isSubCommand(command)) {
      return ok({
        cmd: command,
        resolvedName: resolvedCommandName,
      });
    }

    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
      return error(
        new ArcscordError({
          code: arcscordErrorCodes.CommandResolutionFailed,
          message: "invalid type get for interaction for handle subCommand",
          metadata: { commandName: interaction.commandName, interactionType: interaction.type, reason: "invalid-subcommand-interaction-type" },
        }),
      );
    }

    const subCommandName = interaction.options.getSubcommand(false);
    if (!subCommandName) {
      return error(
        new ArcscordError({
          code: arcscordErrorCodes.CommandResolutionFailed,
          message: `missing subCommandName in interaction for command ${command.name}`,
          metadata: { commandName: command.name, interactionType: interaction.type, reason: "missing-subcommand-name" },
        }),
      );
    }

    let list = command.subCommands;
    const subCommandGroupName = interaction.options.getSubcommandGroup(false);
    if (subCommandGroupName && command.subCommandsGroups) {
      const group = command.subCommandsGroups[subCommandGroupName];
      if (!group) {
        return error(
          new ArcscordError({
            code: arcscordErrorCodes.CommandResolutionFailed,
            message: `no subCommand group found for ${subCommandGroupName} in command ${command.name}`,
            metadata: { commandName: command.name, interactionType: interaction.type, reason: "subcommand-group-not-found" },
          }),
        );
      }
      list = group.subCommands;
    }

    const cmd = list?.find(cmd => cmd.name === subCommandName);

    if (!cmd) {
      return error(
        new ArcscordError({
          code: arcscordErrorCodes.CommandResolutionFailed,
          message: `no subCommand found for ${subCommandName} subCommand for ${command.name}`,
          metadata: { commandName: command.name, interactionType: interaction.type, reason: "subcommand-not-found" },
        }),
      );
    }

    return ok({
      cmd,
      resolvedName: resolvedCommandName,
    });
  }

  private async handleInteraction(interaction: CommandInteraction): Promise<void> {
    const dispatchDiagnostic = managerDiagnosticChannels.command.dispatch.hasSubscribers;
    const dispatchOperationId = dispatchDiagnostic ? Symbol("arcscord:manager:command:dispatch") : undefined;
    const dispatchStartedAt = dispatchDiagnostic ? Date.now() : 0;
    if (dispatchDiagnostic) {
      managerDiagnosticChannels.command.dispatch.publish({
        phase: "start",
        manager: this,
        client: this.client,
        timestamp: dispatchStartedAt,
        operationId: dispatchOperationId!,
        startedAt: dispatchStartedAt,
        interaction,
      });
    }

    /* Locale — resolved first so dispatch error replies are translated */
    const locale = await this.client.localeManager.detectLanguage({
      interaction,
      user: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
    });

    /* Resolve command from registry */
    const [cmdErr, infos] = this.getCommand(interaction);
    if (cmdErr !== null) {
      this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "resolve", cmdErr, locale);
      return this.sendDispatchError(
        this.options.dispatchDiagnostics.commandNotFound,
        "error",
        cmdErr,
        { interaction, locale },
      );
    }

    const command = infos.cmd;
    let context;

    /* Build typed context */
    if (interaction.isChatInputCommand()) {
      if ("name" in command) {
        const [optErr, options] = command.options
          ? await parseOptions<typeof command.options>(interaction, command.options)
          : [null, null];

        if (optErr !== null) {
          this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "options", optErr, locale);
          return this.sendDispatchError(
            this.options.dispatchDiagnostics.optionParsingFailed,
            "error",
            optErr,
            { interaction, locale },
          );
        }

        context = new SlashCommandContext<AnySubCommandHandler>(command, interaction, {
          resolvedName: infos.resolvedName,
          // `options` is `ContextOptions<OptionsList> | null` here, but `T` can only
          // be pinned to the erased storage type (`AnySubCommandHandler`), whose
          // `options` field is optional — so `ContextOptionsDef<T>` collapses to
          // `null`. The real shape is guaranteed correct at runtime by `parseOptions`.
          options: options as SlashCommandContextBuilderOptions<AnySubCommandHandler>["options"],
          client: this.client,
          locale,
        });
      }
      else if (command.slash) {
        const [optErr, options] = command.slash.options
          ? await parseOptions<typeof command.slash.options>(interaction, command.slash.options)
          : [null, null];

        if (optErr !== null) {
          this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "options", optErr, locale);
          return this.sendDispatchError(
            this.options.dispatchDiagnostics.optionParsingFailed,
            "error",
            optErr,
            { interaction, locale },
          );
        }

        context = new SlashCommandContext<PartialCommandDefinitionForSlash>(command, interaction, {
          resolvedName: infos.resolvedName,
          // Same erasure boundary as above: `command` is `AnyCommandHandler`, whose
          // `slash` is optional, so it can't be used directly as `T` (fails the
          // generic constraint); `PartialCommandDefinitionForSlash` is the closest
          // valid `T`, and its `options` is likewise optional, so `ContextOptionsDef<T>`
          // collapses to `null` even though the real value is non-null at runtime.
          options: options as SlashCommandContextBuilderOptions<PartialCommandDefinitionForSlash>["options"],
          client: this.client,
          locale,
        });
      }
      else {
        const err = new ArcscordError({
          code: arcscordErrorCodes.CommandContextCreationFailed,
          message: `invalid command, get slash command interaction for command ${infos.resolvedName}`,
          metadata: { commandName: infos.resolvedName, interactionId: interaction.id, reason: "slash-context-mismatch" },
        });
        this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "context", err, locale);
        return this.sendDispatchError(
          this.options.dispatchDiagnostics.contextCreationFailed,
          "error",
          err,
          { interaction, locale },
        );
      }
    }
    else if (interaction.isUserContextMenuCommand()) {
      if ("user" in command) {
        context = new UserCommandContext(command, interaction, {
          resolvedName: infos.resolvedName,
          targetUser: interaction.targetUser,
          targetMember: interaction.targetMember,
          client: this.client,
          locale,
        });
      }
      else {
        const err = new ArcscordError({
          code: arcscordErrorCodes.CommandContextCreationFailed,
          message: `invalid command, got user command interaction for command ${infos.resolvedName}`,
          metadata: { commandName: infos.resolvedName, interactionId: interaction.id, reason: "user-context-mismatch" },
        });
        this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "context", err, locale);
        return this.sendDispatchError(
          this.options.dispatchDiagnostics.contextCreationFailed,
          "error",
          err,
          { interaction, locale },
        );
      }
    }
    else if (interaction.isMessageContextMenuCommand()) {
      if ("message" in command) {
        context = new MessageCommandContext(command, interaction, {
          resolvedName: infos.resolvedName,
          message: interaction.targetMessage,
          client: this.client,
          locale,
        });
      }
      else {
        const err = new ArcscordError({
          code: arcscordErrorCodes.CommandContextCreationFailed,
          message: `invalid command, got message command interaction for command ${infos.resolvedName}`,
          metadata: { commandName: infos.resolvedName, interactionId: interaction.id, reason: "message-context-mismatch" },
        });
        this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "context", err, locale);
        return this.sendDispatchError(
          this.options.dispatchDiagnostics.contextCreationFailed,
          "error",
          err,
          { interaction, locale },
        );
      }
    }
    else {
      const err = new ArcscordError({
        code: arcscordErrorCodes.CommandContextCreationFailed,
        message: `invalid interaction type: ${interaction.type}`,
        metadata: { interactionId: interaction.id, reason: "unsupported-interaction-type" },
      });
      this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "context", err, locale);
      return this.sendDispatchError(
        this.options.dispatchDiagnostics.contextCreationFailed,
        "error",
        err,
        { interaction, locale },
      );
    }

    if (!context) {
      return;
    }

    /* Defer */
    if (command.preReply) {
      const [deferErr] = await context.deferReply({
        flags: command.preReply === "ephemeral" ? MessageFlags.Ephemeral : undefined,
      });

      if (deferErr !== null) {
        this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "defer", deferErr, locale);
        return this.sendDispatchError(
          this.options.dispatchDiagnostics.deferFailed,
          "warn",
          deferErr,
          undefined, // interaction state unknown after failed defer
        );
      }
    }

    const startedAt = Date.now();
    const execution: CommandExecutionContext = {
      interaction,
      command,
      context: context as CommandContext,
      locale,
      get defer() {
        return context.defer;
      },
      ...createExecutionControls<string | true>(startedAt),
    };

    const executeDiagnostic = managerDiagnosticChannels.command.execute.hasSubscribers;
    const executeOperationId = executeDiagnostic ? Symbol("arcscord:manager:command:execute") : undefined;
    if (executeDiagnostic) {
      managerDiagnosticChannels.command.execute.publish({
        phase: "start",
        manager: this,
        client: this.client,
        timestamp: startedAt,
        operationId: executeOperationId!,
        startedAt,
        execution,
      });
    }
    const outcome = await this.runExecutionHandlers(
      this.options.executionHandlers,
      execution,
      () => this.executeCommand(execution),
      this,
    );
    if (!outcome) {
      if (executeDiagnostic && managerDiagnosticChannels.command.execute.hasSubscribers) {
        managerDiagnosticChannels.command.execute.publish({
          phase: "error",
          manager: this,
          client: this.client,
          timestamp: Date.now(),
          operationId: executeOperationId!,
          execution,
          error: new Error("command execution handler failed"),
        });
      }
      this.publishCommandDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "execution", new Error("command execution handler failed"), locale);
      return;
    }
    if (executeDiagnostic && managerDiagnosticChannels.command.execute.hasSubscribers) {
      managerDiagnosticChannels.command.execute.publish({
        phase: "end",
        manager: this,
        client: this.client,
        timestamp: outcome.endedAt,
        operationId: executeOperationId!,
        startedAt: outcome.startedAt,
        endedAt: outcome.endedAt,
        durationMs: outcome.durationMs,
        execution,
        outcome,
      });
    }
    if (dispatchDiagnostic && managerDiagnosticChannels.command.dispatch.hasSubscribers) {
      managerDiagnosticChannels.command.dispatch.publish({
        phase: "end",
        manager: this,
        client: this.client,
        operationId: dispatchOperationId!,
        ...diagnosticTiming(dispatchStartedAt),
        interaction,
        outcome,
      });
    }
  }

  private publishCommandDispatchError(
    active: boolean,
    operationId: symbol | undefined,
    interaction: CommandInteraction,
    stage: import("#/manager/diagnostics").CommandDispatchStage,
    err: unknown,
    locale?: string,
  ): void {
    if (active && managerDiagnosticChannels.command.dispatch.hasSubscribers) {
      managerDiagnosticChannels.command.dispatch.publish({
        phase: "error",
        manager: this,
        client: this.client,
        timestamp: Date.now(),
        operationId: operationId!,
        interaction,
        stage,
        locale,
        error: err,
      });
    }
  }

  private async executeCommand(
    execution: CommandExecutionContext,
  ): Promise<CommandExecutionOutcome> {
    const { command, context } = execution;
    const middlewareExit = await this.runMiddleware(command, context);

    if (middlewareExit.status !== "success") {
      return execution.complete(middlewareExit);
    }
    if (!middlewareExit.value) {
      return execution.cancel();
    }
    context.additional = middlewareExit.value as typeof context.additional;

    try {
      const run = command.run as (ctx: CommandContext) => ReturnType<AnyCommandHandler["run"]>;
      const rawResult = await run(context);
      return execution.complete(normalizeHandlerReturn(rawResult));
    }
    catch (e) {
      return execution.complete(executionDefect(e));
    }
  }

  private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const diagnostic = managerDiagnosticChannels.command.autocomplete.hasSubscribers;
    const operationId = diagnostic ? Symbol("arcscord:manager:command:autocomplete") : undefined;
    const startedAt = diagnostic ? Date.now() : 0;
    if (diagnostic) {
      managerDiagnosticChannels.command.autocomplete.publish({
        phase: "start",
        manager: this,
        client: this.client,
        timestamp: startedAt,
        operationId: operationId!,
        startedAt,
        interaction,
      });
    }
    const [cmdErr, infos] = this.getCommand(interaction);
    if (cmdErr !== null) {
      this.publishAutocompleteError(diagnostic, operationId, interaction, cmdErr);
      const level = this.options.dispatchDiagnostics.autocompleteError ?? "warn";
      applyDiagnosticLevel(this.logger, level, cmdErr);
      return;
    }

    const command = infos.cmd;
    const focused = interaction.options.getFocused(true);

    if (!hasAutocomplete(command)) {
      this.publishAutocompleteError(diagnostic, operationId, interaction, new Error("autocomplete handler unavailable"), command, focused);
      this.logger.warn(`Got autocomplete for command without autocomplete handler: ${infos.resolvedName}`);
      return;
    }

    const handler = command.autocomplete[focused.name];
    if (!handler) {
      const err = new ArcscordError({
        code: arcscordErrorCodes.AutocompleteExecutionFailed,
        message: `no autocomplete handler found for option "${focused.name}" in command "${infos.resolvedName}"`,
        metadata: { commandName: infos.resolvedName, focused, handlers: Object.keys(command.autocomplete) },
      });
      const level = this.options.dispatchDiagnostics.autocompleteError ?? "warn";
      this.publishAutocompleteError(diagnostic, operationId, interaction, err, command, focused);
      applyDiagnosticLevel(this.logger, level, err);
      return;
    }

    const locale = await this.client.localeManager.detectLanguage({
      interaction,
      user: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
    });

    const context = new AutocompleteContext(command, interaction, {
      resolvedName: infos.resolvedName,
      client: this.client,
      locale,
    });

    try {
      const [acErr] = await handler(context);
      if (acErr !== null) {
        this.publishAutocompleteError(diagnostic, operationId, interaction, acErr, command, focused, locale);
        const level = this.options.dispatchDiagnostics.autocompleteError ?? "warn";
        if (isArcscordError(acErr)) {
          applyDiagnosticLevel(this.logger, level, acErr);
        }
        else if (level !== "ignore") {
          this.logger.logError(acErr, { commandName: infos.resolvedName });
        }
        return;
      }
      this.trace(`Autocomplete handled for command ${infos.resolvedName}`);
      if (diagnostic && managerDiagnosticChannels.command.autocomplete.hasSubscribers) {
        managerDiagnosticChannels.command.autocomplete.publish({
          phase: "end",
          manager: this,
          client: this.client,
          operationId: operationId!,
          ...diagnosticTiming(startedAt),
          interaction,
          command,
          focused,
          locale,
        });
      }
    }
    catch (e) {
      const err = new ArcscordError({
        code: arcscordErrorCodes.AutocompleteExecutionFailed,
        message: `autocomplete threw: ${anyToError(e).message}`,
        metadata: { commandName: infos.resolvedName },
        cause: e,
      });
      this.publishAutocompleteError(diagnostic, operationId, interaction, err, command, focused, locale);
      this.logger.logError(err);
    }
  }

  private publishAutocompleteError(
    active: boolean,
    operationId: symbol | undefined,
    interaction: AutocompleteInteraction,
    err: unknown,
    command?: CommandExecutionContext["command"],
    focused?: { name: string; value: string | number },
    locale?: string,
  ): void {
    if (active && managerDiagnosticChannels.command.autocomplete.hasSubscribers) {
      managerDiagnosticChannels.command.autocomplete.publish({
        phase: "error",
        manager: this,
        client: this.client,
        timestamp: Date.now(),
        operationId: operationId!,
        interaction,
        command,
        focused,
        locale,
        error: err,
      });
    }
  }

  private async runMiddleware(
    command: AnyCommandHandler | AnySubCommandHandler,
    context: CommandContext,
  ): Promise<ExecutionExit<object | false, unknown>> {
    const additional: Record<string, NonNullable<unknown>> = {};
    if (!command.use || command.use.length === 0) {
      return executionSuccess({});
    }
    for (const middleware of command.use) {
      try {
        const result = await middleware.run(context);
        if (result.status === "failure") {
          return executionFailure(await result.failure);
        }
        if (result.status === "cancel") {
          if (result.result) {
            const exit = normalizeHandlerReturn(await result.result);
            if (exit.status !== "success") {
              return exit;
            }
          }
          return executionSuccess(false);
        }
        additional[middleware.name] = result.value;
      }
      catch (e) {
        return executionDefect(e);
      }
    }
    return executionSuccess(additional);
  }

  /**
   * Default result handler.
   * Logs errors, sends an ephemeral error reply, and logs successful executions at debug level.
   *
   * A custom `resultHandler` can call this to reuse the default behavior after
   * running its own logic: `return manager.defaultResultHandler(infos)`.
   *
   * @deprecated Use {@link defaultCommandExecutionHandler} in
   * `executionHandlers`.
   */
  async defaultResultHandler(infos: CommandResultHandlerInfos): Promise<void> {
    return runDefaultCommandExecution(infos, {
      kind: "completed",
      exit: infos.exit,
      startedAt: infos.startedAt,
      endedAt: infos.endedAt,
      durationMs: infos.durationMs,
      incidentId: infos.incidentId,
    }, this);
  }
}
