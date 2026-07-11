import type { CommandInteraction } from "discord.js";
import type { AnyCommandHandler, AnySubCommandHandler, CommandContext } from "#/base";
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
 */
export type CommandResultHandler = (
  infos: CommandResultHandlerInfos,
) => void | Promise<void>;

/**
 * @internal
 */
export type CommandResultHandlerImplementer = {
  resultHandler: CommandResultHandler;
};

/**
 * Options for configuring the command manager.
 */
export type CommandManagerOptions = {
  /**
   * Custom result handler called after every `run()` execution.
   *
   * Receives a normalized `Result` regardless of whether `run()` returned or
   * threw. Check `infos.status` to distinguish between the two cases.
   *
   * @default logs errors and sends `client.getErrorMessage(...)` to the user
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
