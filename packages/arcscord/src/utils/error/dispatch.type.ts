import type { BaseError } from "@arcscord/better-error";
import type { BaseInteraction, BaseMessageOptions } from "discord.js";
import type i18next from "i18next";
import type { LoggerInterface } from "#/utils/logger/logger.type";
import type { MaybePromise } from "#/utils/type/util.type";

/**
 * Controls the log output level for a dispatch error.
 *
 * - `"ignore"` — silently discard the error.
 * - `"debug"` / `"info"` / `"warn"` / `"error"` — log at the corresponding level.
 * - `"throw"` — rethrow the error, crashing the process unless caught upstream.
 */
export type DiagnosticLevel = "ignore" | "debug" | "info" | "warn" | "error" | "throw";

/**
 * Context available to a {@link DispatchReplyFn} when building a custom
 * user-facing error reply.
 */
export type DispatchMessageContext = {
  /** The Discord interaction that triggered the dispatch error. */
  interaction: BaseInteraction;
  /** The dispatch error that was caught. */
  error: BaseError;
  /** The detected i18next language for this interaction. */
  locale: string;
  /** A translation function fixed to `locale`, or `undefined` when i18n is disabled. */
  t?: typeof i18next.t;
  /** The manager logger — available for conditional logging inside the reply function. */
  logger: LoggerInterface;
};

/**
 * A function that dynamically builds the reply message sent to the user when
 * a dispatch error occurs. Receives full locale/i18n context.
 */
export type DispatchReplyFn = (ctx: DispatchMessageContext) => MaybePromise<BaseMessageOptions>;

/**
 * Controls how a pre-`run()` dispatch error is logged and whether a reply is
 * sent back to the user.
 *
 * ```ts
 * // Log as warning, reply with a static message
 * { level: "warn", reply: { content: "This component is no longer available." } }
 *
 * // Log as error, use client.getErrorMessage(...) (default)
 * { level: "error" }
 *
 * // Log only — no user-facing reply
 * { level: "error", reply: false }
 *
 * // Dynamic i18n reply
 * { level: "warn", reply: ({ t, locale }) => ({ content: t?.("errors.stale") ?? "Unavailable" }) }
 * ```
 */
export type DispatchErrorConfig = {
  /**
   * Log level applied to the error.
   * @default "error"
   */
  level?: DiagnosticLevel;

  /**
   * User-facing reply sent after logging.
   *
   * - **Absent** (default): use `client.getErrorMessage(id, locale)`.
   * - `false`: send no reply.
   * - `BaseMessageOptions`: send a static ephemeral reply.
   * - `DispatchReplyFn`: build the reply from interaction context (i18n, locale).
   */
  reply?: false | BaseMessageOptions | DispatchReplyFn;
};

/**
 * Per-case dispatch diagnostics for command interactions.
 *
 * Each field controls what happens when the corresponding pre-`run()` failure
 * occurs. Omitted fields use their documented defaults.
 */
export type CommandDispatchDiagnostics = {
  /**
   * No registered command matched the incoming interaction.
   * @default { level: "error" }
   */
  commandNotFound?: DispatchErrorConfig;

  /**
   * Slash command option parsing failed.
   * @default { level: "error" }
   */
  optionParsingFailed?: DispatchErrorConfig;

  /**
   * Context creation failed because the interaction type did not match the
   * command definition (e.g. a slash interaction for a user-context command).
   * @default { level: "error" }
   */
  contextCreationFailed?: DispatchErrorConfig;

  /**
   * The pre-reply `deferReply` call failed before `run()` was invoked.
   * Defaults to no user-facing reply because the interaction state is unknown.
   * @default { level: "warn", reply: false }
   */
  deferFailed?: DispatchErrorConfig;

  /**
   * An error occurred during an autocomplete interaction.
   * Only a log level is accepted — autocomplete interactions cannot receive
   * normal replies.
   * @default "warn"
   */
  autocompleteError?: DiagnosticLevel;
};

/**
 * Per-case dispatch diagnostics for component interactions.
 *
 * Each field controls what happens when the corresponding pre-`run()` failure
 * occurs. Omitted fields use their documented defaults.
 */
export type ComponentDispatchDiagnostics = {
  /**
   * No registered component matched the interaction `customId`.
   *
   * This commonly occurs when a message with components is still present after
   * a bot restart or code update. Configure a custom `reply` to give users a
   * helpful message in that case.
   *
   * @default { level: "error" }
   */
  componentNotFound?: DispatchErrorConfig;

  /**
   * Multiple registered components matched the same `customId`.
   * @default { level: "error" }
   */
  multipleMatches?: DispatchErrorConfig;

  /**
   * Context creation failed (unknown component type or modal field parsing error).
   * @default { level: "error" }
   */
  contextCreationFailed?: DispatchErrorConfig;

  /**
   * The pre-reply `deferReply` call failed before `run()` was invoked.
   * Defaults to no user-facing reply because the interaction state is unknown.
   * @default { level: "warn", reply: false }
   */
  deferFailed?: DispatchErrorConfig;
};
