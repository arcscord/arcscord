import type { CommandInteraction } from "discord.js";
import type { AnyCommandHandler, AnySubCommandHandler, CommandContext } from "#/base";
import type { CommandManager } from "#/manager/command/command_manager.class";
import type { CommandRegistrationConfig } from "#/manager/command/command_registration";
import type { CommandDispatchDiagnostics } from "#/utils/error/dispatch.type";
import type { ExecutionExit } from "#/utils/error/execution_exit";

/**
 * Shared fields present in all command result handler payloads.
 */
type BaseCommandResultHandlerInfos = {
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

  /**
   * Unix timestamp (ms) when the command started running.
   */
  startedAt: number;

  /**
   * Unix timestamp (ms) when the command finished running.
   */
  endedAt: number;

  /** Total execution duration in milliseconds. */
  durationMs: number;

  /** Correlation ID generated for an unexpected defect. */
  incidentId?: string;
};

/** Payload received by `resultHandler` after every command execution. */
export type CommandResultHandlerInfos = BaseCommandResultHandlerInfos & {
  exit: ExecutionExit<string | true, unknown>;
};

/**
 * Handler called after every command `run()` execution, whether it returned
 * normally or threw.
 *
 * Receives the owning {@link CommandManager} as a second argument so a custom
 * handler can run its own logic and then delegate to the framework default via
 * `manager.defaultResultHandler(infos)`.
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
export type CommandManagerOptions = {
  /**
   * Custom result handler called after every `run()` execution.
   *
   * Receives the normalized `infos.exit` regardless of whether `run()` returned
   * or threw; check `infos.exit.status` to distinguish the cases. The owning
   * manager is passed as the second argument, so a custom handler can do its own
   * work and then delegate to the default behavior with
   * `return manager.defaultResultHandler(infos)`.
   *
   * @default {@link CommandManager.defaultResultHandler} — logs errors and sends
   * `client.getErrorMessage(...)` to the user
   */
  resultHandler?: CommandResultHandler;

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
