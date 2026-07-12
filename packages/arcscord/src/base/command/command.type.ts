import type { NonNullish, Result } from "@arcscord/error";
import type {
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { BaseCommandDefinition, CommandContext, FullCommandDefinition, SlashCommandDefinition, SubCommandDefinition } from "#/base";
import type { AutocompleteContext, AutocompleteHandlers } from "#/base/command/autocomplete_context";
import type { CommandMiddleware } from "#/base/command/command_middleware";
import type { OptionsList } from "#/base/command/option.type";
import type { PreReplyMode } from "#/utils/type/pre_reply.type";
import type { MaybePromise } from "#/utils/type/util.type";

/**
 * Normalized internal result of running a command.
 * Used by the manager after normalizing the raw return value of `run()`.
 */
export type CommandRunResult<E extends NonNullish = NonNullish> = Result<string | true, E>;

/**
 * All values a `run()` function may return.
 *
 * The manager normalizes these to a {@link CommandRunResult} before calling
 * the result handler:
 * - `void` / `undefined` → `ok(true)`
 * - `string` or `true` → `ok(value)`
 * - `Result<string | true, E>` → normalized as an expected failure or success
 */
export type CommandRunReturn<E extends NonNullish = NonNullish>
  = | void
    | string
    | true
    | CommandRunResult<E>;

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
 * Behavioural properties attached to a command definition (everything that is
 * not part of the Discord definition itself).
 *
 * Kept separate from the definition so that the definition type stays clean
 * when spread at the top level of a {@link CommandHandler}.
 *
 * @template Build - The command definition
 * @template Middlewares - The list of middleware used in command
 */
export type CommandExtras<
  Build extends SubCommandDefinition | FullCommandDefinition = SubCommandDefinition | FullCommandDefinition,
  Middlewares extends CommandMiddleware[] = CommandMiddleware[],
> = {
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
   * `Result<string | true, E>`. The manager normalizes all forms
   * before calling the result handler.
   *
   * @param ctx - The command context.
   */
  run: {
    /** Bivariance-preserving wrapper. @internal */
    bivarianceHack: (
      ctx: CommandContext<NoInfer<Build>, Middlewares>,
    ) => MaybePromise<CommandRunReturn>;
  }["bivarianceHack"];

  /**
   * Middlewares to be used with the command.
   */
  use?: Middlewares;

  autocomplete?: AutocompleteHandlers<NoInfer<Build>>;
};

/**
 * Command properties.
 *
 * The Discord definition ({@link FullCommandDefinition} or
 * {@link SubCommandDefinition}) is spread directly at the top level alongside
 * the behavioural {@link CommandExtras}.
 *
 * @template Build - The command definition
 * @template Middlewares - The list of middleware used in command
 */
export type CommandHandler<
  Build extends SubCommandDefinition | FullCommandDefinition = SubCommandDefinition | FullCommandDefinition,
  Middlewares extends CommandMiddleware[] = CommandMiddleware[],
> = Build & CommandExtras<Build, Middlewares>;

/**
 * @internal
 */
export type IsOmitted<T, Default> = [T, Default] extends [Default, T] ? true : false;

/**
 * Reassembles a {@link FullCommandDefinition} from the individually inferred
 * surfaces. A surface only contributes a (required) key when it was provided, so
 * `CommandContext` discriminates the right context union.
 *
 * @internal
 */
export type AssembleFullDefinition<Slash, Message, User>
  = (IsOmitted<Slash, SlashCommandDefinition> extends true ? Record<never, never> : { slash: Slash })
    & (IsOmitted<Message, BaseCommandDefinition> extends true ? Record<never, never> : { message: Message })
    & (IsOmitted<User, BaseCommandDefinition> extends true ? Record<never, never> : { user: User });

/**
 * Input type for {@link createCommand}.
 *
 * Each surface is a naked type-parameter property (constraint without
 * `undefined`) so that it is inferred independently of `run` — reliable
 * inference, exactly like the old single `build` property — while the
 * constraint provides contextual typing for callback values such as
 * localization callbacks. The inferred surfaces are reassembled to type the
 * command context.
 *
 * @internal
 */
export type FullCommandInput<
  Slash extends SlashCommandDefinition,
  Message extends BaseCommandDefinition,
  User extends BaseCommandDefinition,
  Middlewares extends CommandMiddleware[] = CommandMiddleware[],
> = {
  slash?: Slash;
  message?: Message;
  user?: User;
} & CommandExtras<AssembleFullDefinition<Slash, Message, User>, Middlewares>;

/**
 * Input type for {@link createSubCommand}.
 *
 * The option map is a naked type-parameter property so that it is inferred
 * independently of `run`, while {@link SubCommandDefinition} provides contextual
 * typing for the remaining (name/description/localization) properties.
 *
 * @internal
 */
export type SubCommandInput<
  Options extends OptionsList,
  Middlewares extends CommandMiddleware[] = CommandMiddleware[],
> = Omit<SubCommandDefinition, "options"> & {
  options?: Options;
} & CommandExtras<SubCommandDefinition & { options: Options }, Middlewares>;

/**
 * Broad command handler shape used when storing heterogeneous commands.
 *
 * @internal
 */
export type AnyCommandHandler = FullCommandDefinition & {
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
export type AnySubCommandHandler = SubCommandDefinition & {
  preReply?: PreReplyMode;
  // Heterogeneous subcommand collections store handlers with different option maps.
  run: BivariantCommandCallback<any>;
  use?: CommandMiddleware[];
  autocomplete?: Record<string, (ctx: AutocompleteContext<any, any, any>) => MaybePromise<CommandRunResult>>;
};
