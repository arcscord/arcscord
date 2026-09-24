import type {
  AnyCommandHandler,
  AnySubCommandHandler,
  BaseCommandDefinition,
  CommandExtras,
  CommandHandler,
  SlashCommandDefinition,
  SlashWithSubsCommandDefinition,
  SubCommandDefinition,
  SubCommandInput,
} from "#/base";
import type { CommandMiddleware } from "#/base/command/command_middleware";
import type { OptionsList } from "#/base/command/option.type";

/**
 * Create a Command exposing one or more surfaces (slash, message, user).
 *
 * @param options command definition and behaviour
 *
 * @example
 * ```ts
 * createCommand({
 *   slash: {
 *     name: "ping",
 *     description: "get a pong",
 *   },
 *   run: (ctx) => {
 *     return ctx.reply("Pong");
 *   },
 * });
 * ```
 */
export function createCommand<
  const Slash extends SlashCommandDefinition = SlashCommandDefinition,
  const Message extends BaseCommandDefinition = BaseCommandDefinition,
  const User extends BaseCommandDefinition = BaseCommandDefinition,
  Middlewares extends CommandMiddleware[] = [],
>(
  options: {
    slash: Slash;
    message: Message;
    user: User;
  } & CommandExtras<{ slash: Slash; message: Message; user: User }, Middlewares>,
): CommandHandler<{ slash: Slash; message: Message; user: User }, Middlewares>;
export function createCommand<
  const Slash extends SlashCommandDefinition = SlashCommandDefinition,
  const Message extends BaseCommandDefinition = BaseCommandDefinition,
  const _User extends BaseCommandDefinition = BaseCommandDefinition,
  Middlewares extends CommandMiddleware[] = [],
>(
  options: {
    slash: Slash;
    message: Message;
  } & CommandExtras<{ slash: Slash; message: Message }, Middlewares>,
): CommandHandler<{ slash: Slash; message: Message }, Middlewares>;
export function createCommand<
  const Slash extends SlashCommandDefinition = SlashCommandDefinition,
  const _Message extends BaseCommandDefinition = BaseCommandDefinition,
  const User extends BaseCommandDefinition = BaseCommandDefinition,
  Middlewares extends CommandMiddleware[] = [],
>(
  options: {
    slash: Slash;
    user: User;
  } & CommandExtras<{ slash: Slash; user: User }, Middlewares>,
): CommandHandler<{ slash: Slash; user: User }, Middlewares>;
export function createCommand<
  const _Slash extends SlashCommandDefinition = SlashCommandDefinition,
  const Message extends BaseCommandDefinition = BaseCommandDefinition,
  const User extends BaseCommandDefinition = BaseCommandDefinition,
  Middlewares extends CommandMiddleware[] = [],
>(
  options: {
    message: Message;
    user: User;
  } & CommandExtras<{ message: Message; user: User }, Middlewares>,
): CommandHandler<{ message: Message; user: User }, Middlewares>;
export function createCommand<
  const Slash extends SlashCommandDefinition = SlashCommandDefinition,
  const _Message extends BaseCommandDefinition = BaseCommandDefinition,
  const _User extends BaseCommandDefinition = BaseCommandDefinition,
  Middlewares extends CommandMiddleware[] = [],
>(
  options: {
    slash: Slash;
  } & CommandExtras<{ slash: Slash }, Middlewares>,
): CommandHandler<{ slash: Slash }, Middlewares>;
export function createCommand<
  const _Slash extends SlashCommandDefinition = SlashCommandDefinition,
  const Message extends BaseCommandDefinition = BaseCommandDefinition,
  const _User extends BaseCommandDefinition = BaseCommandDefinition,
  Middlewares extends CommandMiddleware[] = [],
>(
  options: {
    message: Message;
  } & CommandExtras<{ message: Message }, Middlewares>,
): CommandHandler<{ message: Message }, Middlewares>;
export function createCommand<
  const _Slash extends SlashCommandDefinition = SlashCommandDefinition,
  const _Message extends BaseCommandDefinition = BaseCommandDefinition,
  const User extends BaseCommandDefinition = BaseCommandDefinition,
  Middlewares extends CommandMiddleware[] = [],
>(
  options: {
    user: User;
  } & CommandExtras<{ user: User }, Middlewares>,
): CommandHandler<{ user: User }, Middlewares>;
export function createCommand(options: AnyCommandHandler): AnyCommandHandler {
  return options;
}

/**
 * Create a SubCommand, used inside a {@link createCommandWithSubs} definition.
 *
 * @param options subcommand definition and behaviour
 *
 * @example
 * ```ts
 * createSubCommand({
 *   name: "anime",
 *   description: "Search anime",
 *   run: (ctx) => {
 *     return ctx.reply("...");
 *   },
 * });
 * ```
 */
export function createSubCommand<
  const Options extends OptionsList = Record<string, never>,
  Middlewares extends CommandMiddleware[] = [],
  const Name extends string = string,
>(
  options: SubCommandInput<Options, Middlewares, Name> & { options: Options },
): CommandHandler<
  Omit<SubCommandDefinition, "name" | "options"> & { name: Name; options: Options },
  Middlewares
>;
export function createSubCommand<
  const Options extends OptionsList = Record<string, never>,
  Middlewares extends CommandMiddleware[] = [],
  const Name extends string = string,
>(
  options: Omit<SubCommandInput<Options, Middlewares, Name>, "options">,
): CommandHandler<
  Omit<SubCommandDefinition, "name" | "options"> & { name: Name },
  Middlewares
>;
export function createSubCommand(options: AnySubCommandHandler): AnySubCommandHandler {
  return options;
}

/**
 * Create a slash command that groups subcommands (and subcommand groups).
 */
export function createCommandWithSubs<const Definition extends SlashWithSubsCommandDefinition>(
  options: Definition,
): Definition {
  return options;
}
