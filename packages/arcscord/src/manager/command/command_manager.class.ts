import type { ArcClient } from "#/base";
import type { CommandHandler } from "#/base/command";
import type { Command } from "#/base/command/command_definition.type";
import type {
  CommandResultHandler,
  CommandResultHandlerImplementer,
  CommandResultHandlerInfos,
} from "#/manager/command/command_manager.type";
import type { Result } from "@arcscord/error";
import type {
  ApplicationCommand,
  ApplicationCommandDataResolvable,
  AutocompleteInteraction,
  BaseMessageOptions,
  CommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
} from "discord.js";
import type { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import {
  commandInteractionToString,
  hasAutocomplete,
  hasMessageCommand,
  hasSlashCommand,
  hasUserCommand,
  isSubCommand,
  parseOptions,
} from "#/base/command";
import { DmAutoCompleteContext, GuildAutocompleteContext } from "#/base/command/autocomplete_context";
import {
  DmMessageCommandContext,
  DmSlashCommandContext,
  DmUserCommandContext,
  GuildMessageCommandContext,
  GuildSlashCommandContext,
  GuildUserCommandContext,
} from "#/base/command/command_context";
import { preCheck } from "#/base/command/command_precheck";
import { commandToAPI, subCommandListToAPI } from "#/base/command/command_transformer";
import { BaseManager } from "#/base/manager/manager.class";
import { CommandError } from "#/utils";
import { internalErrorEmbed } from "#/utils/discord/embed/embed.const";
import { BaseError } from "@arcscord/better-error";
import { anyToError, error, ok } from "@arcscord/error";
import { ApplicationCommandType } from "discord-api-types/v10";

/**
 * The `CommandManager` class is responsible for managing commands;
 */
export class CommandManager
  extends BaseManager
  implements CommandResultHandlerImplementer {
  commands: Map<string, Command> = new Map();

  name = "command";

  _resultHandler: CommandResultHandler;

  constructor(client: ArcClient) {
    super(client);

    this._resultHandler = (infos: CommandResultHandlerInfos) => {
      return this.resultHandler(infos);
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
  ): RESTPostAPIApplicationCommandsJSONBody[] {
    const commandsBody: RESTPostAPIApplicationCommandsJSONBody[] = [];
    let totalCommands = 0;
    let slashCommands = 0;
    let messageCommands = 0;
    let userCommands = 0;

    for (const command of commands) {
      if (!isSubCommand(command)) {
        let hasPush = false;
        const data = commandToAPI(command.build, this.client);

        if (data.slash) {
          commandsBody.push(data.slash);
          slashCommands++;
          hasPush = true;
          this.logger.trace(
            `loaded slash builder of command "${data.slash.name}" in group "${group}"`,
          );
        }

        if (data.message) {
          commandsBody.push(data.message);
          messageCommands++;
          hasPush = true;
          this.logger.trace(
            `loaded message builder of command "${data.message.name}" in group "${group}"`,
          );
        }

        if (data.user) {
          commandsBody.push(data.user);
          userCommands++;
          hasPush = true;
          this.logger.trace(
            `loaded user builder of command "${data.user.name}" in group "${group}"`,
          );
        }
        if (!hasPush) {
          this.logger.fatal(
            `no builder found for command "${command.constructor.name}" in group "${group}"`,
            {
              group,
            },
          );
        }
        totalCommands++;
      }
      else {
        commandsBody.push(subCommandListToAPI(command, this.client));
        slashCommands++;
        this.logger.trace(
          `loaded slash builder of command "${command.name}" in group "${group}"`,
        );
      }
    }
    this.logger.info(
      `loaded ${totalCommands} commands for group ${group} ! (${slashCommands} slash`
      + `, ${messageCommands} message, ${userCommands} user)`,
    );

    return commandsBody;
  }

  /**
   * Pushes a set of global commands to the application.
   *
   * @param commands - An array of command data resolvable objects to be registered globally.
   * @return A promise that resolves to an array of globally registered application commands.
   */
  async pushGlobalCommands(
    commands: ApplicationCommandDataResolvable[],
  ): Promise<ApplicationCommand[]> {
    if (!this.client.application) {
      return this.logger.fatal("no application found !");
    }

    try {
      const data = await this.client.application.commands.set(commands);
      this.logger.info(
        `loaded ${commands.length} commands builders globally with success !`,
      );
      return data.map(cmd => cmd);
    }
    catch (e) {
      return this.logger.fatal("failed to load commands globally", {
        baseError: anyToError(e).message,
      });
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
  ): Promise<ApplicationCommand[]> {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      return this.logger.fatal(`guild ${guildId} not found`);
    }

    try {
      const data = await guild.commands.set(commands);
      this.logger.info(
        `loaded ${commands.length} commands builders for guild ${guildId} with success !`,
      );
      return data.map(cmd => cmd);
    }
    catch (e) {
      return this.logger.fatal(`failed to load commands for guild ${guildId}`, {
        baseError: anyToError(e).message,
      });
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
  ): Promise<Result<number, BaseError>> {
    if (!this.client.application) {
      return error(new BaseError("No application found in client"));
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
        new BaseError({
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
            new BaseError({
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
    apiCommands: ApplicationCommand[],
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
          this.logger.warning(
            `slash command "${command.build.slash.name}" not found in API`,
          );
        }
        else {
          this.logger.trace(
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
          this.logger.warning(
            `message command "${command.build.message.name}" not found in API`,
          );
        }
        else {
          this.logger.trace(
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
          this.logger.warning(
            `user command "${command.build.user.name}" not found in API`,
          );
        }
        else {
          this.logger.trace(
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
        this.logger.warning(`slash commands "${name}" not found in API`);
      }
      else {
        this.logger.trace(`resolve slash command ${name} (${apiCommand.id}) !`);
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
    apiCommands: ApplicationCommand[],
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
  resolveCommandName(apiCommand: ApplicationCommand): string {
    if (apiCommand.guildId) {
      return `g_${apiCommand.id}_${apiCommand.name}`;
    }
    return `${apiCommand.id}_${apiCommand.name}`;
  }

  private getCommand(interaction: CommandInteraction | AutocompleteInteraction): Result<
    {
      cmd: CommandHandler;
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
    /* INITIALISATION */
    const [infos, err] = this.getCommand(interaction);

    if (err) {
      this.logger.logError(err.generateId());
      return this.sendInternalError(
        interaction,
        internalErrorEmbed(this.client, err.id),
      );
    }

    const command = infos.cmd;

    /* PRECHECK */
    const [next, err2] = await preCheck(
      command.options || {},
      this.client,
      interaction,
    );
    if (err2) {
      this.logger.logError(err2.generateId());
      return this.sendInternalError(
        interaction,
        internalErrorEmbed(this.client, err2.id),
      );
    }

    if (!next) {
      this.logger.trace(
        `precheck for user ${interaction.user.username} with command ${infos.resolvedName} don't passed`,
      );
      return;
    }

    /* GUILD CHECKS */

    let guildInfos: null | {
      guild: Guild;
      member: GuildMember;
      channel: GuildBasedChannel;
    };

    if (
      interaction.inGuild()
      && interaction.authorizingIntegrationOwners["0"]
    ) {
      let guild;
      let member;
      let channel;
      try {
        guild = interaction.inCachedGuild()
          ? interaction.guild
          : await this.client.guilds.fetch(interaction.guildId);
      }
      catch (e) {
        const bError = new BaseError({
          message: `failed to get guild because ${anyToError(e).message}`,
          originalError: anyToError(e),
        }).generateId();

        this.logger.logError(bError);
        return this.sendInternalError(
          interaction,
          internalErrorEmbed(this.client, bError.id),
        );
      }

      try {
        member = await guild.members.fetch(interaction.user.id);
      }
      catch (e) {
        const bError = new BaseError({
          message: `failed to get member because ${anyToError(e).message}`,
          originalError: anyToError(e),
        }).generateId();

        this.logger.logError(bError);
        return this.sendInternalError(
          interaction,
          internalErrorEmbed(this.client, bError.id),
        );
      }

      try {
        channel
          = interaction.channel
          ?? (await guild.channels.fetch(interaction.channelId));
      }
      catch (e) {
        const bError = new BaseError({
          message: `failed to get channel because ${anyToError(e).message}`,
          originalError: anyToError(e),
        }).generateId();

        this.logger.logError(bError);
        return this.sendInternalError(
          interaction,
          internalErrorEmbed(this.client, bError.id),
        );
      }

      if (channel === null) {
        const bError = new BaseError({
          message: `get nul channel value for channel ${interaction.channelId}`,
          debugs: {
            guildId: interaction.guildId,
          },
        }).generateId();

        this.logger.logError(bError);
        return this.sendInternalError(
          interaction,
          internalErrorEmbed(this.client, bError.id),
        );
      }

      guildInfos = {
        guild,
        member,
        channel,
      };
    }
    else {
      guildInfos = null;
    }

    /* Locale */
    const locale = await this.client.localeManager.detectLanguage({
      interaction,
      user: interaction.user,
      guild: guildInfos?.guild || null,
      channel: interaction.channel,
    });

    let context;

    /* Slash Commands */
    if (interaction.isChatInputCommand()) {
      if ("name" in command.build) {
        const [options, err] = command.build.options
          ? await parseOptions<typeof command.build.options>(
            interaction,
            command.build.options,
          )
          : [null, null];

        if (err) {
          this.logger.logError(err.generateId());
          return this.sendInternalError(
            interaction,
            internalErrorEmbed(this.client, err.id),
          );
        }

        context = guildInfos
          ? new GuildSlashCommandContext<typeof command.build>(
            command,
            interaction,
            {
              resolvedName: infos.resolvedName,
              ...guildInfos,
              // @ts-expect-error fix generic bug
              options,
              client: this.client,
              locale,
            },
          )
          : new DmSlashCommandContext(command, interaction, {
            resolvedName: infos.resolvedName,
            // @ts-expect-error fix generic bug
            options,
            client: this.client,
            locale,
          });
      }
      else if (command.build.slash) {
        const [options, err] = command.build.slash.options
          ? await parseOptions<typeof command.build.slash.options>(
            interaction,
            command.build.slash.options,
          )
          : [null, null];

        if (err) {
          this.logger.logError(err.generateId());
          return this.sendInternalError(
            interaction,
            internalErrorEmbed(this.client, err.id),
          );
        }

        context = guildInfos
          ? new GuildSlashCommandContext(command, interaction, {
            resolvedName: infos.resolvedName,
            ...guildInfos,
            // @ts-expect-error fix generic bug
            options,
            client: this.client,
            locale,
          })
          : new DmSlashCommandContext(command, interaction, {
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
        this.logger.logError(bError.generateId());
        return this.sendInternalError(
          interaction,
          internalErrorEmbed(this.client, bError.id),
        );
      }

      /* User Context Menu Command */
    }
    else if (interaction.isUserContextMenuCommand()) {
      if ("user" in command.build) {
        let targetMember: GuildMember | null = null;
        if (guildInfos && interaction.targetMember) {
          try {
            targetMember = await guildInfos.guild.members.fetch(
              interaction.targetMember.user.id,
            );
          }
          catch (e) {
            const bError = new BaseError({
              message: "failed to fetch target member",
              originalError: anyToError(e),
            });
            this.logger.logError(bError.generateId());
            return this.sendInternalError(
              interaction,
              internalErrorEmbed(this.client, bError.id),
            );
          }
        }

        context = guildInfos
          ? new GuildUserCommandContext(command, interaction, {
            resolvedName: infos.resolvedName,
            ...guildInfos,
            targetUser: interaction.targetUser,
            targetMember,
            client: this.client,
            locale,
          })
          : new DmUserCommandContext(command, interaction, {
            resolvedName: infos.resolvedName,
            targetUser: interaction.targetUser,
            client: this.client,
            locale,
          });
      }
      else {
        const bError = new BaseError({
          message: `invalid command, get user command interaction for command ${infos.resolvedName}`,
        });
        this.logger.logError(bError.generateId());
        return this.sendInternalError(
          interaction,
          internalErrorEmbed(this.client, bError.id),
        );
      }

      /* Message Context Menu Command */
    }
    else if (interaction.isMessageContextMenuCommand()) {
      if ("message" in command.build) {
        context = guildInfos
          ? new GuildMessageCommandContext(command, interaction, {
            resolvedName: infos.resolvedName,
            ...guildInfos,
            message: interaction.targetMessage,
            client: this.client,
            locale,
          })
          : new DmMessageCommandContext(command, interaction, {
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
        this.logger.logError(bError.generateId());
        return this.sendInternalError(
          interaction,
          internalErrorEmbed(this.client, bError.id),
        );
      }
    }
    else {
      const bError = new BaseError({
        message: `invalid interaction type: ${interaction.type}`,
      });
      this.logger.logError(bError.generateId());
      return this.sendInternalError(
        interaction,
        internalErrorEmbed(this.client, bError.id),
      );
    }

    /* Command Defer */
    if (!context) {
      return;
    }

    if (command.options?.preReply) {
      const [, err3] = await context.deferReply({
        ephemeral: command.options?.preReplyEphemeral,
      });

      if (err3) {
        this.logger.logError(err3.generateId());
        return this.sendInternalError(
          interaction,
          internalErrorEmbed(this.client, err3.id),
        );
      }
    }

    const start = Date.now();
    /* Middlewares */

    if (command.use && command.use.length > 0) {
      for (const middleware of command.use) {
        try {
          // @ts-expect-error fix generics with middleware
          const result = await middleware.run(context);
          if (result.cancel) {
            const [result2, err4] = await result.cancel;
            if (err4) {
              this.logger.logError(err4.generateId());
              return this.sendInternalError(
                interaction,
                internalErrorEmbed(this.client, err4.id),
              );
            }
            const infos: CommandResultHandlerInfos = {
              result: ok(
                `Middleware ${middleware.name} stopped, result : ${result2}`,
              ),
              interaction,
              command,
              defer: context.defer,
              start,
              end: Date.now(),
            };

            return this._resultHandler(infos);
          }

          context.additional[middleware.name] = result.next;
        }
        catch (e) {
          const infos: CommandResultHandlerInfos = {
            result: error(
              new CommandError({
                message: `failed to run middleware : ${anyToError(e).message}`,
                ctx: context,
                originalError: anyToError(e),
                debugs: {
                  middlewareName: middleware.name,
                },
              }),
            ),
            interaction,
            command,
            defer: context.defer,
            start,
            end: Date.now(),
          };

          return this._resultHandler(infos);
        }
      }
    }

    /* Command Run */

    try {
      // @ts-expect-error fix error with never type
      const result = await command.run(context);
      const infos: CommandResultHandlerInfos = {
        result,
        interaction,
        command,
        defer: context.defer,
        start,
        end: Date.now(),
      };

      return this._resultHandler(infos);
    }
    catch (e) {
      const infos: CommandResultHandlerInfos = {
        result: error(
          new CommandError({
            message: `failed to run command : ${anyToError(e).message}`,
            ctx: context,
            originalError: anyToError(e),
          }),
        ),
        interaction,
        command,
        defer: context.defer,
        start,
        end: Date.now(),
      };

      return this._resultHandler(infos);
    }
  }

  private async handleAutocomplete(
    interaction: AutocompleteInteraction,
  ): Promise<void> {
    /* INITIALISATION */
    const [infos, err] = this.getCommand(interaction);

    if (err) {
      return this.logger.logError(err.generateId());
    }

    const command = infos.cmd;

    if (!hasAutocomplete(command)) {
      return this.logger.warning(
        `Get autocomplete for command without autocomplete function : ${infos.resolvedName}`,
      );
    }

    /* Guild Check */
    let guildInfos: null | {
      guild: Guild;
      member: GuildMember;
      channel: GuildBasedChannel;
    };

    if (interaction.inGuild()) {
      try {
        const guild = await this.client.guilds.fetch(interaction.guildId);
        let member, channel;
        try {
          member = await guild.members.fetch(interaction.user.id);
        }
        catch (e) {
          const bError = new BaseError({
            message: `failed to get member because ${anyToError(e).message}`,
            originalError: anyToError(e),
          }).generateId();

          return this.logger.logError(bError);
        }

        try {
          channel
            = interaction.channel
            ?? (await guild.channels.fetch(interaction.channelId));
        }
        catch (e) {
          const bError = new BaseError({
            message: `failed to get channel because ${anyToError(e).message}`,
            originalError: anyToError(e),
          }).generateId();

          return this.logger.logError(bError);
        }

        if (channel === null) {
          const bError = new BaseError({
            message: `get nul channel value for channel ${interaction.channelId}`,
            debugs: {
              guildId: interaction.guildId,
            },
          }).generateId();

          return this.logger.logError(bError);
        }
        guildInfos = {
          guild,
          member,
          channel,
        };
      }
      catch (e) {
        // if is user installed app

        guildInfos = e === true ? null : null;
      }
    }
    else {
      guildInfos = null;
    }

    /* Locale */
    const locale = await this.client.localeManager.detectLanguage({
      interaction,
      user: interaction.user,
      guild: guildInfos?.guild || null,
      channel: interaction.channel,
    });

    const context = guildInfos
      ? new GuildAutocompleteContext(command, interaction, {
        ...guildInfos,
        resolvedName: infos.resolvedName,
        client: this.client,
        locale,
      })
      : new DmAutoCompleteContext(command, interaction, {
        resolvedName: infos.resolvedName,
        client: this.client,
        locale,
      });

    try {
      const [result, err2] = await command.autocomplete(context);
      if (err2) {
        return this.logger.logError(err2.generateId());
      }

      this.logger.trace(
        `Run autocomplete for command ${infos.resolvedName}, result : ${result}`,
      );
    }
    catch (e) {
      return this.logger.error(
        `Failed to run autocomplete, error : ${anyToError(e).message}`,
      );
    }
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
    const [result, err] = infos.result;
    if (err !== null) {
      err.generateId();
      this.logger.logError(err);
      return this.sendInternalError(
        infos.interaction,
        internalErrorEmbed(this.client, err.id),
        infos.defer,
      );
    }

    this.logger.info(
      `${infos.interaction.user.username} used command ${commandInteractionToString(infos.interaction)}. Result : ${
        typeof result === "string" ? result : "success"
      }`,
    );
  }
}
