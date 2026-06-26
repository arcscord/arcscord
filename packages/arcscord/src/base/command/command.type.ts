import type { Result } from "@arcscord/error";
import type {
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { CommandContext, FullCommandDefinition, SubCommandDefinition } from "#/base";
import type { AutocompleteContext, AutocompleteHandlers } from "#/base/command/autocomplete_context";
import type { CommandMiddleware } from "#/base/command/command_middleware";
import type { CommandError } from "#/utils/error/class/command_error";
import type { PreReplyMode } from "#/utils/type/pre_reply.type";
import type { MaybePromise } from "#/utils/type/util.type";

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
   * Whether to defer the interaction before executing middlewares and the command.
   *
   * Use `"ephemeral"` to make the deferred response visible only to the user
   * who ran the command.
   *
   * @default false
   */
  preReply?: PreReplyMode;

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

  autocomplete?: AutocompleteHandlers<Build>;

};

/**
 * Broad command handler shape used when storing heterogeneous commands.
 *
 * @internal
 */
export type AnyCommandHandler = {
  build: FullCommandDefinition;
  preReply?: PreReplyMode;
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
  preReply?: PreReplyMode;
  // Heterogeneous subcommand collections store handlers with different option maps.
  run: BivariantCommandCallback<any>;
  use?: CommandMiddleware[];
  autocomplete?: Record<string, BivariantCommandCallback<any>>;
};
