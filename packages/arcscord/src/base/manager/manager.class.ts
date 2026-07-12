import type { BaseInteraction, BaseMessageOptions } from "discord.js";
import type { ArcClient } from "#/base/client/client.class";
import type { ArcscordError } from "#/utils/error/arcscord_error";
import type { DiagnosticLevel, DispatchErrorConfig, DispatchMessageContext } from "#/utils/error/dispatch.type";
import type { LoggerInterface } from "#/utils/logger/logger.type";
import { anyToError } from "@arcscord/error";
import { MessageFlags } from "discord.js";
import { applyDiagnosticLevel } from "#/utils/error/run_normalize";

/**
 * Abstract class representing a base manager that all other managers should extend.
 */
export abstract class BaseManager {
  /**
   * The client instance
   */
  client: ArcClient;

  /**
   * The name of the manager. Should be defined by subclasses.
   */
  name: string;

  logger: LoggerInterface;

  /**
   * Constructs a new instance of the BaseManager.
   *
   * @param client - The ArcClient instance.
   */
  constructor(client: ArcClient, name: string) {
    this.client = client;
    this.logger = client.createLogger(name);
    this.name = name;
  }

  /**
   * Logs a trace message if tracing is enabled in the client options.
   *
   * @param msg - The message to be logged.
   */
  trace(msg: string): void {
    if (this.client.arcOptions.enableInternalTrace) {
      this.logger.trace(msg);
    }
  }

  /**
   * Runs a manager result handler without letting a broken custom handler
   * escape into Discord.js' event emitter as an unhandled rejection.
   */
  protected async runResultHandler(handler: () => void | Promise<void>): Promise<void> {
    try {
      await handler();
    }
    catch (e) {
      this.logger.logError(e, { source: "resultHandler" });
    }
  }

  /**
   * Applies a dispatch error config: logs at the configured level and
   * optionally sends an ephemeral reply to the user.
   *
   * Use this for pre-`run()` failures (command not found, option parsing
   * error, defer failure, etc.). Errors during `run()` or middleware should
   * be forwarded to `resultHandler` instead.
   *
   * @param config - The dispatch config from manager options (may be undefined).
   * @param defaultLevel - Fallback level when `config.level` is not set.
   * @param err - The error to log and optionally surface to the user.
   * @param replyCtx - When provided, an ephemeral reply is sent to the user
   *   unless `config.reply === false`.
   * @param replyCtx.interaction - The interaction
   * @param replyCtx.locale - the detected locale with the locale detector
   */
  protected async sendDispatchError(
    config: DispatchErrorConfig | undefined,
    defaultLevel: DiagnosticLevel,
    err: ArcscordError,
    replyCtx?: {
      interaction: BaseInteraction;
      locale: string;
    },
  ): Promise<void> {
    const level = config?.level ?? defaultLevel;
    const incidentId = crypto.randomUUID();
    applyDiagnosticLevel(this.logger, level, err, { incidentId });

    if (!replyCtx) {
      return;
    }

    const { interaction, locale } = replyCtx;
    const replyConfig = config?.reply;

    if (replyConfig === false) {
      return;
    }

    if (!interaction.isRepliable()) {
      return;
    }

    let message: BaseMessageOptions;

    if (replyConfig === undefined) {
      message = this.client.getErrorMessage(incidentId, locale);
    }
    else if (typeof replyConfig === "function") {
      try {
        const ctx: DispatchMessageContext = {
          interaction,
          error: err,
          locale,
          t: this.client.createMessageContext(locale).t,
          logger: this.logger,
        };
        message = await replyConfig(ctx);
      }
      catch (error) {
        this.logger.logError(error, {
          source: "dispatchMessageCallback",
          incidentId,
        });
        message = this.client.getErrorMessage(incidentId, locale);
      }
    }
    else {
      message = replyConfig;
    }

    try {
      await interaction.reply({
        ...message,
        flags: MessageFlags.Ephemeral,
      });
    }
    catch (e) {
      this.logger.error("failed to send dispatch error reply", {
        baseError: anyToError(e).message,
      });
    }
  }
}
