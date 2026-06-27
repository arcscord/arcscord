import type { CommandInteraction } from "discord.js";
import type { AnyCommandHandler, AnySubCommandHandler, CommandContext, CommandRunResult } from "#/base";
import type { CommandDispatchDiagnostics } from "#/utils/error/dispatch.type";

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
  start: number;

  /**
   * Unix timestamp (ms) when the command finished running.
   */
  end: number;
};

/**
 * Payload delivered to `resultHandler` when `run()` returned normally
 * (with a `Result`, a raw value, or `void`).
 */
export type CommandReturnedHandlerInfos = BaseCommandResultHandlerInfos & {
  status: "returned";
  /**
   * The normalized result of `run()`. May be `ok` or `error` — the author
   * explicitly returned an error `Result`.
   */
  result: CommandRunResult;
};

/**
 * Payload delivered to `resultHandler` when `run()` threw an unhandled
 * exception or a middleware threw.
 *
 * There is no `result` field here — the thrown value has not been normalized.
 * Use `thrownValue` directly and construct whatever error type you need.
 * The default handler wraps it in a `CommandError`.
 */
export type CommandThrownHandlerInfos = BaseCommandResultHandlerInfos & {
  status: "thrown";
  /**
   * The raw value that was thrown by `run()` or middleware.
   * May be any type — a `CommandError`, a plain `Error`, a string, etc.
   */
  thrownValue: unknown;
};

/**
 * Payload received by `resultHandler` after every `run()` execution.
 *
 * Use the `status` discriminant to branch between the two cases:
 * ```ts
 * resultHandler: (infos) => {
 *   if (infos.status === "thrown") {
 *     // infos.thrownValue is the raw thrown value (not wrapped)
 *     return;
 *   }
 *   const [err, value] = infos.result;
 * }
 * ```
 */
export type CommandResultHandlerInfos
  = | CommandReturnedHandlerInfos
    | CommandThrownHandlerInfos;

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
   * Per-case configuration for dispatch errors that occur before `run()` is
   * invoked (command not found, option parsing failure, defer failure, etc.).
   *
   * Each key accepts a {@link DispatchErrorConfig} that controls the log level
   * and optional user-facing reply independently.
   */
  dispatchDiagnostics?: CommandDispatchDiagnostics;
};
