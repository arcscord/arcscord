import type { Result } from "@arcscord/error";
import type {
  APIApplicationCommand,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type {
  ApplicationCommand,
  ApplicationCommandDataResolvable,
  AutocompleteInteraction,
  BaseMessageOptions,
  CommandInteraction,
} from "discord.js";
import type { AnyCommandHandler, AnySubCommandHandler, ArcClient } from "#/base";
import type { CommandContext } from "#/base/command";
import type {
  Command,
  SlashWithSubsCommandDefinition,
  SubCommandDefinition,
} from "#/base/command/command_definition.type";
import type { Option, OptionsList } from "#/base/command/option.type";
import type {
  CommandErrorHandler,
  CommandErrorHandlerInfos,
  CommandManagerOptions,
  CommandResultHandler,
  CommandResultHandlerImplementer,
  CommandResultHandlerInfos,
} from "#/manager/command/command_manager.type";
import { BaseError } from "@arcscord/better-error";
import { anyToError, error, ok } from "@arcscord/error";
import { ApplicationCommandType, Routes } from "discord-api-types/v10";
import {
  AutocompleteContext,
  commandInteractionToString,
  hasAutocomplete,
  hasMessageCommand,
  hasSlashCommand,
  hasUserCommand,
  isSubCommand,
  MessageCommandContext,
  parseOptions,
  SlashCommandContext,
  UserCommandContext,
} from "#/base/command";
import { preCheck } from "#/base/command/command_precheck";
import { commandToAPI, subCommandListToAPI } from "#/base/command/command_transformer";
import { BaseManager } from "#/base/manager/manager.class";
import { CommandError, CommandValidationError, validateCommands } from "#/utils";
import { internalErrorEmbed } from "#/utils/discord/embed/embed.const";
import { InternalError } from "#/utils/error/class/internal_error";

export type ApplicationCommandRegistration = Pick<ApplicationCommand, "id" | "name" | "type"> & {
  guildId: string | null;
};

/**
 * The `CommandManager` class is responsible for managing commands;
 */
export class CommandManager
  extends BaseManager
  implements CommandResultHandlerImplementer {
  commands: Map<string, Command> = new Map();

  options: Required<CommandManagerOptions>;

  constructor(client: ArcClient, options?: CommandManagerOptions) {
    super(client, "command");

    this.options = {
      resultHandler: this.resultHandler.bind(this),
      errorHandler: this.errorHandler.bind(this),
      ...options,
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

  get handleResult(): CommandResultHandler {
    return this.options.resultHandler;
  }

  get handleError(): CommandErrorHandler {
    return this.options.errorHandler;
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
  ): Result<RESTPostAPIApplicationCommandsJSONBody[], InternalError> {
    const [commandsValidationErr] = validateCommands(commands, this.client, {
      createError: options => new CommandValidationError(options),
      group,
    });
    if (commandsValidationErr) {
      return error(commandsValidationErr);
    }

    const commandsBody: RESTPostAPIApplicationCommandsJSONBody[] = [];
    let totalCommands = 0;
    let slashCommands = 0;
    let messageCommands = 0;
    let userCommands = 0;

    for (const command of commands) {
      if (!isSubCommand(command)) {
        const [validationErr] = this.validateCommandAutocomplete(command, group);
        if (validationErr) {
          return error(validationErr);
        }

        let hasPush = false;
        const data = commandToAPI(command.build, this.client);

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
          return error(new InternalError({
            message: `no builder found for command "${command.constructor.name}" in group "${group}"`,
            debugs: {
              group,
            },
          }));
        }
        totalCommands++;
      }
      else {
        const [validationErr] = this.validateSubCommandListAutocomplete(command, group);
        if (validationErr) {
          return error(validationErr);
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

    return ok(commandsBody);
  }

  private validateCommandAutocomplete(command: AnyCommandHandler, group: string): Result<true, InternalError> {
    if (!hasSlashCommand(command.build) || !command.build.slash.options) {
      return this.validateAutocompleteHandlers(command.autocomplete, undefined, command.build.slash?.name ?? command.build.message?.name ?? command.build.user?.name ?? "unknown", group);
    }

    return this.validateAutocompleteHandlers(
      command.autocomplete,
      command.build.slash.options,
      command.build.slash.name,
      group,
    );
  }

  private validateSubCommandListAutocomplete(command: SlashWithSubsCommandDefinition, group: string): Result<true, InternalError> {
    for (const subCommand of command.subCommands ?? []) {
      const [err] = this.validateSubCommandAutocomplete(subCommand.build, subCommand.autocomplete, `${command.name}.${subCommand.build.name}`, group);
      if (err) {
        return error(err);
      }
    }

    if (command.subCommandsGroups) {
      for (const [groupName, subCommandGroup] of Object.entries(command.subCommandsGroups)) {
        for (const subCommand of subCommandGroup.subCommands) {
          const [err] = this.validateSubCommandAutocomplete(
            subCommand.build,
            subCommand.autocomplete,
            `${command.name}.${groupName}.${subCommand.build.name}`,
            group,
          );
          if (err) {
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
  ): Result<true, InternalError> {
    return this.validateAutocompleteHandlers(handlers, build.options, commandName, group);
  }

  private validateAutocompleteHandlers(
    handlers: Record<string, unknown> | undefined,
    options: OptionsList | undefined,
    commandName: string,
    group: string,
  ): Result<true, InternalError> {
    const autocompleteOptions = Object.entries(options ?? {})
      .filter(([, option]) => this.isAutocompleteOption(option))
      .map(([name]) => name);
    const handlerNames = Object.keys(handlers ?? {});

    for (const optionName of autocompleteOptions) {
      if (!handlers?.[optionName]) {
        return error(new InternalError({
          message: `missing autocomplete handler for option "${optionName}" in command "${commandName}"`,
          debugs: {
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
        return error(new InternalError({
          message: `autocomplete handler "${handlerName}" does not match an option in command "${commandName}"`,
          debugs: {
            group,
            commandName,
            handlerName,
            options: Object.keys(options ?? {}),
          },
        }));
      }

      if (!this.isAutocompleteOption(option)) {
        return error(new InternalError({
          message: `autocomplete handler "${handlerName}" targets an option without autocomplete enabled in command "${commandName}"`,
          debugs: {
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
   * @return A promise that resolves to a result object containing an array of globally registered application commands or an error.
   */
  async pushGlobalCommands(
    commands: ApplicationCommandDataResolvable[],
  ): Promise<Result<ApplicationCommandRegistration[], InternalError>> {
    if (!this.client.application) {
      if (!this.client.arcOptions.applicationId) {
        return error(new InternalError("No application found in client"));
      }

      try {
        const data = await this.client.rest.put(
          Routes.applicationCommands(this.client.arcOptions.applicationId),
          {
            body: commands,
          },
        ) as APIApplicationCommand[];
        this.trace(
          `Registered ${commands.length} global commands`,
        );
        return ok(data.map(cmd => this.apiCommandToResolvedCommand(cmd)));
      }
      catch (e) {
        return error(
          new InternalError({
            message: "Failed to load commands globally",
            originalError: anyToError(e),
          }),
        );
      }
    }

    try {
      const data = await this.client.application.commands.set(commands);
      this.trace(
        `Registered ${commands.length} global commands`,
      );
      return ok(data.map(cmd => cmd));
    }
    catch (e) {
      return error(
        new InternalError({
          message: "Failed to load commands globally",
          originalError: anyToError(e),
        }),
      );
    }
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
  ): Promise<Result<ApplicationCommandRegistration[], InternalError>> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      if (!this.client.arcOptions.applicationId) {
        return error(new InternalError("No application found in client"));
      }

      try {
        const data = await this.client.rest.put(
          Routes.applicationGuildCommands(this.client.arcOptions.applicationId, guildId),
          {
            body: commands,
          },
        ) as APIApplicationCommand[];
        this.trace(
          `Registered ${commands.length} guild commands for guild ${guildId}`,
        );
        return ok(data.map(cmd => this.apiCommandToResolvedCommand(cmd)));
      }
      catch (e) {
        return error(new InternalError({
          message: `failed to load commands for guild ${guildId}`,
          originalError: anyToError(e),
        }));
      }
    }

    try {
      const data = await guild.commands.set(commands);
      this.trace(
        `Registered ${commands.length} guild commands for guild ${guildId}`,
      );
      return ok(data.map(cmd => cmd));
    }
    catch (e) {
      return error(new InternalError({
        message: `failed to load commands for guild ${guildId}`,
        originalError: anyToError(e),
      }));
    }
  }

  /**
   * Deletes unloaded commands from the application for a specified guild.
   *
   * @param guildId - The ID of the guild from which to remove the commands. If not provided, global commands are considered.
   * @return A promise that resolves to a result object containing the number of deleted commands or an error.
   */
  async deleteUnloadedCommands(
    guildId?: string,
  ): Promise<Result<number, InternalError>> {
    if (!this.client.application) {
      return error(new InternalError("No application found in client"));
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
        new InternalError({
          message: "Failed to fetch applications commands",
          originalError: anyToError(e),
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
            new InternalError({
              message: "Failed to delete command",
              originalError: anyToError(e),
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
      if (hasSlashCommand(command.build)) {
        const name = command.build.slash.name;
        const apiCommand = apiCommands.find(
          cmd =>
            (cmd.type as ApplicationCommandType)
            === ApplicationCommandType.ChatInput && cmd.name === name,
        );

        if (!apiCommand) {
          this.trace(
            `slash command "${command.build.slash.name}" not found in API`,
          );
        }
        else {
          this.trace(
            `resolve slash command ${command.build.slash.name} (${apiCommand.id}) !`,
          );
          this.commands.set(this.resolveCommandName(apiCommand), command);
        }
      }

      if (hasMessageCommand(command.build)) {
        const name = command.build.message.name;
        const apiCommand = apiCommands.find(
          cmd =>
            (cmd.type as ApplicationCommandType)
            === ApplicationCommandType.Message && cmd.name === name,
        );

        if (!apiCommand) {
          this.trace(
            `message command "${command.build.message.name}" not found in API`,
          );
        }
        else {
          this.trace(
            `resolve message command ${command.build.message.name} (${apiCommand.id}) !`,
          );
          this.commands.set(this.resolveCommandName(apiCommand), command);
        }
      }

      if (hasUserCommand(command.build)) {
        const name = command.build.user.name;
        const apiCommand = apiCommands.find(
          cmd =>
            (cmd.type as ApplicationCommandType)
            === ApplicationCommandType.User && cmd.name === name,
        );

        if (!apiCommand) {
          this.trace(
            `user command "${command.build.user.name}" not found in API`,
          );
        }
        else {
          this.trace(
            `resolve user command ${command.build.user.name} (${apiCommand.id}) !`,
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
        this.trace(`slash commands "${name}" not found in API`);
      }
      else {
        this.trace(`resolve slash command ${name} (${apiCommand.id}) !`);
        this.commands.set(this.resolveCommandName(apiCommand), command);
      }
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
  resolveCommandName(apiCommand: ApplicationCommandRegistration): string {
    if (apiCommand.guildId) {
      return `g_${apiCommand.id}_${apiCommand.name}`;
    }
    return `${apiCommand.id}_${apiCommand.name}`;
  }

  private apiCommandToResolvedCommand(command: APIApplicationCommand): ApplicationCommandRegistration {
    return {
      id: command.id,
      name: command.name,
      type: command.type,
      guildId: command.guild_id ?? null,
    };
  }

  private getCommand(interaction: CommandInteraction | AutocompleteInteraction): Result<
    {
      cmd: AnyCommandHandler | AnySubCommandHandler;
      resolvedName: string;
    },
    BaseError
  > {
    if (!interaction.command) {
      return error(
        new BaseError({
          message: `no command object found for interaction with ${interaction.commandName}`,
          debugs: {
            data: interaction.toJSON(),
          },
        }),
      );
    }
    const resolvedCommandName = this.resolveCommandName(interaction.command);
    const command = this.commands.get(resolvedCommandName);

    if (!command) {
      return error(
        new BaseError({
          message: `no command found with full id ${resolvedCommandName}`,
          debugs: {
            commands: this.commands.keys(),
            command: interaction.command.toJSON(),
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
        new BaseError({
          message: "invalid type get for interaction for handle subCommand",
        }),
      );
    }

    const subCommandName = interaction.options.getSubcommand(false);
    if (!subCommandName) {
      return error(
        new BaseError({
          message: `missing subCommandName in interaction for command ${command.name}`,
          debugs: {
            data: interaction.options.data,
          },
        }),
      );
    }

    let list = command.subCommands;
    const subCommandGroupName = interaction.options.getSubcommandGroup(false);
    if (subCommandGroupName && command.subCommandsGroups) {
      list = command.subCommandsGroups[subCommandGroupName].subCommands;
    }

    const cmd = list?.find(cmd => cmd.build.name === subCommandName);

    if (!cmd) {
      return error(
        new BaseError({
          message: `no subCommand found for ${subCommandName} subCommand for ${command.name}`,
        }),
      );
    }

    return ok({
      cmd,
      resolvedName: resolvedCommandName,
    });
  }

  private async handleInteraction(interaction: CommandInteraction): Promise<void> {
    await this.client.localeManager.ready;

    /* INITIALIZATION */
    const [err, infos] = this.getCommand(interaction);

    if (err) {
      return this.handleError({
        error: err,
        interaction,
        internal: true,
      });
    }

    const command = infos.cmd;

    /* Locale */
    const locale = await this.client.localeManager.detectLanguage({
      interaction,
      user: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
    });

    /* PRECHECK */
    const [err2, next] = await preCheck(
      command.options || {},
      this.client,
      interaction,
      locale,
    );
    if (err2) {
      return this.handleError({
        error: err2,
        interaction,
        internal: true,
      });
    }

    if (!next) {
      this.logger.trace(
        `Command precheck blocked ${infos.resolvedName}`,
      );
      return;
    }

    let context;

    /* Slash Commands */
    if (interaction.isChatInputCommand()) {
      if ("name" in command.build) {
        const [err, options] = command.build.options
          ? await parseOptions<typeof command.build.options>(
              interaction,
              command.build.options,
            )
          : [null, null];

        if (err) {
          return this.handleError({
            error: err,
            interaction,
            internal: true,
          });
        }

        context = new SlashCommandContext(command, interaction, {
          resolvedName: infos.resolvedName,
          // @ts-expect-error fix generic bug
          options,
          client: this.client,
          locale,
        });
      }
      else if (command.build.slash) {
        const [err, options] = command.build.slash.options
          ? await parseOptions<typeof command.build.slash.options>(
              interaction,
              command.build.slash.options,
            )
          : [null, null];

        if (err) {
          return this.handleError({
            error: err,
            interaction,
            internal: true,
          });
        }

        context = new SlashCommandContext(command, interaction, {
          resolvedName: infos.resolvedName,
          // @ts-expect-error fix generic bug
          options,
          client: this.client,
          locale,
        });
      }
      else {
        const bError = new BaseError({
          message: `invalid command, get slash command interaction for command ${infos.resolvedName}`,
        });
        return this.handleError({
          error: bError,
          interaction,
          internal: true,
        });
      }

      /* User Context Menu Command */
    }
    else if (interaction.isUserContextMenuCommand()) {
      if ("user" in command.build) {
        context = new UserCommandContext(command, interaction, {
          resolvedName: infos.resolvedName,
          targetUser: interaction.targetUser,
          targetMember: interaction.targetMember,
          client: this.client,
          locale,
        });
      }
      else {
        const bError = new BaseError({
          message: `invalid command, get user command interaction for command ${infos.resolvedName}`,
        });
        return this.handleError({
          error: bError,
          interaction,
          internal: true,
        });
      }

      /* Message Context Menu Command */
    }
    else if (interaction.isMessageContextMenuCommand()) {
      if ("message" in command.build) {
        context = new MessageCommandContext(command, interaction, {
          resolvedName: infos.resolvedName,
          message: interaction.targetMessage,
          client: this.client,
          locale,
        });
      }
      else {
        const bError = new BaseError({
          message: `invalid command, get user command interaction for command ${infos.resolvedName}`,
        });
        return this.handleError({
          error: bError,
          interaction,
          internal: true,
        });
      }
    }
    else {
      const bError = new BaseError({
        message: `invalid interaction type: ${interaction.type}`,
      });
      return this.handleError({
        error: bError,
        interaction,
        internal: true,
      });
    }

    /* Command Defer */
    if (!context) {
      return;
    }

    if (command.options?.preReply) {
      const [err3] = await context.deferReply({
        ephemeral: command.options?.preReplyEphemeral,
      });

      if (err3) {
        return this.handleError({
          error: err3,
          interaction,
          internal: true,
        });
      }
    }

    const start = Date.now();
    /* Middlewares */

    const [err4, middlewareResult] = await this.runMiddleware(command, context as CommandContext);
    if (err4) {
      return this.handleError({
        error: err4,
        interaction,
        command,
        context: context as CommandContext,
        internal: false,
      });
    }
    if (!middlewareResult) {
      return;
    }
    context.additional = middlewareResult as typeof context.additional;

    /* Command Run */

    try {
      const run = command.run as (ctx: CommandContext) => ReturnType<AnyCommandHandler["run"]>;
      const result = await run(context as CommandContext);
      const infos: CommandResultHandlerInfos = {
        result,
        interaction,
        command,
        context: context as CommandContext,
        locale,
        defer: context.defer,
        start,
        end: Date.now(),
      };

      return this.handleResult(infos);
    }
    catch (e) {
      return this.handleError({
        error: new CommandError({
          message: `failed to run command : ${anyToError(e).message}`,
          ctx: context,
          originalError: anyToError(e),
        }),
        interaction,
        command,
        context: context as CommandContext,
        internal: false,
      });
    }
  }

  private async handleAutocomplete(
    interaction: AutocompleteInteraction,
  ): Promise<void> {
    await this.client.localeManager.ready;

    /* INITIALIZATION */
    const [err, infos] = this.getCommand(interaction);

    if (err) {
      return this.handleError({
        error: err,
        interaction,
        internal: true,
        autocomplete: true,
      });
    }

    const command = infos.cmd;
    const focused = interaction.options.getFocused(true);

    if (!hasAutocomplete(command)) {
      return this.logger.warning(
        `Get autocomplete for command without autocomplete function : ${infos.resolvedName}`,
      );
    }

    const handler = command.autocomplete[focused.name];
    if (!handler) {
      return this.handleError({
        error: new BaseError({
          message: `no autocomplete handler found for option ${focused.name} in command ${infos.resolvedName}`,
          debugs: {
            focused,
            handlers: Object.keys(command.autocomplete),
          },
        }),
        interaction,
        internal: true,
        autocomplete: true,
      });
    }

    /* Locale */
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
      const [err2] = await handler(context);
      if (err2) {
        return this.handleError({
          error: err2,
          interaction,
          internal: true,
          autocomplete: true,
        });
      }

      this.trace(
        `Autocomplete handled for command ${infos.resolvedName}`,
      );
    }
    catch (e) {
      return this.handleError({
        error: new CommandError({
          message: anyToError(e).message,
          ctx: context,
          originalError: anyToError(e),
        }),
        interaction,
        internal: false,
        autocomplete: true,
      });
    }
  }

  private async runMiddleware(command: AnyCommandHandler | AnySubCommandHandler, context: CommandContext): Promise<Result<object | false, CommandError>> {
    const additional: Record<string, NonNullable<unknown>> = {};
    if (!command.use || command.use.length === 0) {
      return ok({});
    }
    const middlewareNames = new Set<string>();
    for (const middleware of command.use) {
      if (middlewareNames.has(middleware.name)) {
        return error(new CommandError({
          message: `duplicate middleware name "${middleware.name}"`,
          ctx: context,
          debugs: {
            middlewareName: middleware.name,
          },
        }));
      }
      middlewareNames.add(middleware.name);
    }
    for (const middleware of command.use) {
      try {
        const result = await middleware.run(context);
        if (result.error) {
          return error(await result.error);
        }

        if (result.cancel) {
          const [err] = await result.cancel;
          if (err) {
            return error(err);
          }
          return ok(false);
        }
        additional[middleware.name] = result.next;
      }
      catch (e) {
        return error(new CommandError({
          message: `failed to run middleware : ${anyToError(e).message}`,
          ctx: context,
          originalError: anyToError(e),
          debugs: {
            middlewareName: middleware.name,
          },
        }));
      }
    }
    return ok(additional);
  }

  async sendInternalError(
    interaction: CommandInteraction,
    message: BaseMessageOptions,
    defer: boolean = false,
  ): Promise<void> {
    try {
      if (defer) {
        await interaction.editReply(message);
      }
      else {
        await interaction.reply({
          ...message,
          ephemeral: true,
        });
      }
    }
    catch (e) {
      this.logger.error("failed to send internal error message", {
        baseError: anyToError(e).message,
      });
    }
  }

  async resultHandler(infos: CommandResultHandlerInfos): Promise<void> {
    const [err] = infos.result;
    if (err !== null) {
      err.generateId();
      this.logger.logError(err);
      return this.sendInternalError(
        infos.interaction,
        internalErrorEmbed(this.client, err.id, infos.locale),
        infos.defer,
      );
    }

    this.logger.debug(`Command executed: ${commandInteractionToString(infos.interaction)}`);
  }

  async errorHandler(infos: CommandErrorHandlerInfos): Promise<void> {
    const error = infos.error.generateId();
    this.logger.logError(error);

    if (!infos.autocomplete) {
      return this.sendInternalError(
        infos.interaction,
        internalErrorEmbed(this.client, error.id, infos.context?.locale),
        infos.context?.defer,
      );
    }
  }
}
