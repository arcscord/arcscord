import type { Result } from "@arcscord/error";
import type {
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { PermissionsString } from "discord.js";
import type { CommandContext, FullCommandDefinition, SubCommandDefinition } from "#/base";
import type { AutocompleteCommandPart, AutocompleteContext } from "#/base/command/autocomplete_context";
import type { CommandMiddleware } from "#/base/command/command_middleware";
import type { CommandError } from "#/utils/error/class/command_error";
import type { MaybePromise } from "#/utils/type/util.type";

/**
 * Options for a command.
 */
export type CommandOptions = {
  /**
   * Required bot permissions for the command.
   * @default []
   */
  neededPermissions?: PermissionsString[];

  /**
   * Whether to reply before executing the command.
   * @default false
   */
  preReply?: boolean;

  /**
   * Whether to make the pre-reply ephemeral.
   * if {@link CommandOptions.preReply} is false, do nothing
   * @default false
   */
  preReplyEphemeral?: boolean;

};

/**
 * Result of running a command.
 */
export type CommandRunResult = Result<string | true, CommandError>;

/**
 * @internal
 */
export type APICommandObject = {
  slash?: RESTPostAPIChatInputApplicationCommandsJSONBody;
  message?: RESTPostAPIContextMenuApplicationCommandsJSONBody;
  user?: RESTPostAPIContextMenuApplicationCommandsJSONBody;
};

/**
 * @internal
 */
export type AutocompleteCommand = {
  autocomplete: Record<string, (ctx: AutocompleteContext) => MaybePromise<CommandRunResult>>;
};

type BivariantCommandCallback<Ctx> = {
  bivarianceHack: (
    ctx: Ctx,
  ) => MaybePromise<CommandRunResult>;
}["bivarianceHack"];

/**
 * Command properties.
 *
 * @template Build - The command build
 * @template Middlewares - The list of middleware used in command
 */
export type CommandHandler<
  Build extends SubCommandDefinition | FullCommandDefinition = SubCommandDefinition | FullCommandDefinition,
  Middlewares extends CommandMiddleware[] = CommandMiddleware[],
> = {
  /**
   * The command definition/build.
   *
   * Accept {@link FullCommandDefinition} and {@link SubCommandDefinition}
   */
  build: Build;

  /**
   * Options for the command.
   */
  options?: CommandOptions;

  /**
   * Command execution function.
   * @param ctx - The command context.
   * @returns A result of the command execution.
   */
  run: {
    bivarianceHack: (
      ctx: CommandContext<Build, Middlewares>,
    ) => MaybePromise<CommandRunResult>;
  }["bivarianceHack"];

  /**
   * Middlewares to be used with the command.
   */
  use?: Middlewares;

} & AutocompleteCommandPart<Build>;

/**
 * Broad command handler shape used when storing heterogeneous commands.
 *
 * @internal
 */
export type AnyCommandHandler = {
  build: FullCommandDefinition;
  options?: CommandOptions;
  // Heterogeneous command collections store handlers with different context types.
  run: BivariantCommandCallback<any>;
  use?: CommandMiddleware[];
  autocomplete?: Record<string, BivariantCommandCallback<any>>;
};

/**
 * Broad subcommand handler shape used when storing heterogeneous subcommands.
 *
 * @internal
 */
export type AnySubCommandHandler = {
  build: SubCommandDefinition;
  options?: CommandOptions;
  // Heterogeneous subcommand collections store handlers with different option maps.
  run: BivariantCommandCallback<any>;
  use?: CommandMiddleware[];
  autocomplete?: Record<string, BivariantCommandCallback<any>>;
};
