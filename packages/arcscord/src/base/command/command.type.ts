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
 * Normalized internal result of running a command.
 * Used by the manager after normalizing the raw return value of `run()`.
 */
export type CommandRunResult = Result<string | true, CommandError>;

/**
 * All values a `run()` function may return.
 *
 * The manager normalizes these to a {@link CommandRunResult} before calling
 * the result handler:
 * - `void` / `undefined` → `ok(true)`
 * - `string` or `true` → `ok(value)`
 * - `Result<string | true, CommandError>` → returned as-is
 */
export type CommandRunReturn
  = | void
    | string
    | true
    | CommandRunResult;

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
  ) => MaybePromise<CommandRunReturn>;
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
   *
   * May return `void`, a plain `string`, `true`, or a full
   * `Result<string | true, CommandError>`. The manager normalizes all forms
   * before calling the result handler.
   *
   * @param ctx - The command context.
   */
  run: {
    bivarianceHack: (
      ctx: CommandContext<Build, Middlewares>,
    ) => MaybePromise<CommandRunReturn>;
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
  autocomplete?: Record<string, (ctx: AutocompleteContext<any, any, any>) => MaybePromise<CommandRunResult>>;
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
  autocomplete?: Record<string, (ctx: AutocompleteContext<any, any, any>) => MaybePromise<CommandRunResult>>;
};
