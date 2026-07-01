import type {
  AnyCommandHandler,
  AnySubCommandHandler,
  BaseCommandDefinition,
  FullCommandInput,
  SlashCommandDefinition,
  SlashWithSubsCommandDefinition,
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
  options: FullCommandInput<Slash, Message, User, Middlewares>,
): AnyCommandHandler {
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
>(
  options: SubCommandInput<Options, Middlewares>,
): AnySubCommandHandler {
  return options;
}

/**
 * Create a slash command that groups subcommands (and subcommand groups).
 */
export function createCommandWithSubs(options: SlashWithSubsCommandDefinition): SlashWithSubsCommandDefinition {
  return options;
}
