import type { ErrorOptions } from "@arcscord/better-error";
import type { AutocompleteInteraction, CommandInteraction } from "discord.js";
import type { AnyCommandHandler, AnySubCommandHandler } from "#/base/command";
import type { BaseCommandContext } from "#/base/command/command_context";
import { commandInteractionToString } from "#/base/command";
import { InteractionError } from "#/utils/error/class/interaction_error";

type CommandErrorContext = {
  interaction: CommandInteraction | AutocompleteInteraction;
  command: AnyCommandHandler | AnySubCommandHandler;
};

/**
 * Options for creating a CommandError.
 */
export type CommandErrorOptions = ErrorOptions & {
  /**
   * The context of the command.
   */
  ctx: BaseCommandContext | CommandErrorContext;
};

/**
 * Represents an error that occurred during the execution of a command.
 */
export class CommandError extends InteractionError {
  /**
   * The name of the error.
   */
  name = "CommandError";

  /**
   * The interaction associated with the error.
   */
  interaction: CommandInteraction | AutocompleteInteraction;

  /**
   * The context associated with the command error.
   */
  context: BaseCommandContext | CommandErrorContext;

  /**
   * The command properties associated with the error.
   */
  command: AnyCommandHandler | AnySubCommandHandler;

  /**
   * Creates a new instance of `CommandError`.
   *
   * @param options - The options for creating the command error.
   */
  constructor(options: CommandErrorOptions) {
    super({ ...options, interaction: options.ctx.interaction });

    this.interaction = options.ctx.interaction;
    this.context = options.ctx;
    this.command = options.ctx.command;
    this._debugs.set(
      "Command",
      commandInteractionToString(options.ctx.interaction),
    );
  }
}
