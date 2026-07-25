import type { CommandInteraction } from "discord.js";
import type { AnyCommandHandler, AnySubCommandHandler, CommandContext } from "#/base";
import type {
  ExecutionControls,
  ExecutionHandler,
  ExecutionOutcome,
} from "#/base/manager/execution_handler";
import type { CommandManager } from "#/manager/command/command_manager.class";
import type { CommandRegistrationConfig } from "#/manager/command/command_registration";
import type { CommandDispatchDiagnostics } from "#/utils/error/dispatch.type";
import type { ExecutionExit } from "#/utils/error/execution_exit";

/**
 * Shared fields present in all command result handler payloads.
 */
export type BaseCommandExecutionInfos = {
  /**
   * The Discord.js interaction.
   */
  interaction: CommandInteraction;

  /**
   * The resolved command or subcommand handler.
   */
  command: AnyCommandHandler | AnySubCommandHandler;

  /**
   * The Arcscord command context for this execution.
   */
  context: CommandContext;

  /**
   * Detected i18next language for this interaction.
   */
  locale: string;

  /**
   * Whether the reply was deferred before `run()` was called.
   */
  defer: boolean;

};

/**
 * Payload received by `resultHandler` after every command execution.
 *
 * @deprecated Use {@link CommandExecutionContext} and
 * {@link CommandExecutionOutcome}.
 */
export type CommandResultHandlerInfos = BaseCommandExecutionInfos & {
  exit: ExecutionExit<string | true, unknown>;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  incidentId?: string;
};

/** Context exposed to command execution interceptors. */
export type CommandExecutionContext = BaseCommandExecutionInfos
  & ExecutionControls<string | true, unknown>;

/** Outcome returned by command execution interceptors. */
export type CommandExecutionOutcome = ExecutionOutcome<string | true, unknown>;

/** Koa-style interceptor around command middleware and `run()`. */
export type CommandExecutionHandler = ExecutionHandler<
  CommandExecutionContext,
  CommandExecutionOutcome,
  CommandManager
>;

/**
 * Handler called after every command `run()` execution, whether it returned
 * normally or threw.
 *
 * Receives the owning {@link CommandManager} as a second argument so a custom
 * handler can run its own logic and then delegate to the framework default via
 * `manager.defaultResultHandler(infos)`.
 *
 * @deprecated Use {@link CommandExecutionHandler}.
 */
export type CommandResultHandler = (
  infos: CommandResultHandlerInfos,
  manager: CommandManager,
) => void | Promise<void>;

/**
 * @internal
 */
export type CommandResultHandlerImplementer = {
  defaultResultHandler: CommandResultHandler;
};

/**
 * Options for configuring the command manager.
 */
type BaseCommandManagerOptions = {
  /**
   * Controls how loaded commands are synchronized with Discord per scope.
   *
   * By default Arcscord keeps the previous behavior and bulk overwrites the
   * target scope when commands are loaded.
   */
  registration?: CommandRegistrationConfig;

  /**
   * Per-case configuration for dispatch errors that occur before `run()` is
   * invoked (command not found, option parsing failure, defer failure, etc.).
   *
   * Each key accepts a {@link DispatchErrorConfig} that controls the log level
   * and optional user-facing reply independently.
   */
  dispatchDiagnostics?: CommandDispatchDiagnostics;
};

type CommandExecutionHandlerOptions = {
  /**
   * Ordered Koa-style interceptors around command middleware and `run()`.
   *
   * Providing this option replaces Arcscord's default execution handler. Add
   * {@link defaultCommandExecutionHandler} explicitly to reuse the default
   * logging and error replies.
   */
  executionHandlers?: readonly CommandExecutionHandler[];
  resultHandler?: never;
};

type LegacyCommandResultHandlerOptions = {
  executionHandlers?: never;

  /**
   * Custom result handler called after every `run()` execution.
   *
   * @deprecated Use {@link CommandManagerOptions.executionHandlers}.
   */
  resultHandler?: CommandResultHandler;
};

/**
 * Options for configuring the command manager.
 *
 * `executionHandlers` and the deprecated `resultHandler` are mutually exclusive.
 */
export type CommandManagerOptions = BaseCommandManagerOptions
  & (CommandExecutionHandlerOptions | LegacyCommandResultHandlerOptions);
