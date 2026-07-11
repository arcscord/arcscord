import type { BaseMessageOptions, ClientOptions } from "discord.js";
import type i18next from "i18next";
import type { EventManagerOptions } from "#/manager";
import type { CommandManagerOptions } from "#/manager/command/command_manager.type";
import type { ComponentManagerOptions } from "#/manager/component/component_manager.type";
import type { LocaleManagerOptions } from "#/manager/locale/locale_manager.type";
import type { LoggerConstructor, LoggerOptions } from "#/utils/logger/logger.type";
import type { Command } from "../command";
import type { ComponentHandler } from "../components";
import type { AnyEventHandler } from "../event";

/**
 * Represents the options for configuring the ArcClient Logger.
 */
export type ArcClientLoggerOptions = {
  /**
   * If you want to use another logger that console.log
   * @default console.log
   */
  loggerFunc?: (...data: unknown[]) => void;

  /**
   * Change the logger used by the framework, need a constructor, not a class !
   *
   * Only update logger builds in Client, defaultLogger don't are updated !
   * @default {@link ArcLogger}
   */
  customLogger?: LoggerConstructor;

  /**
   * Minimum level to log.
   * Use "debug" in development to show command/component/event execution logs.
   * @default process.env.ARCSCORD_LOG_LEVEL || process.env.LOG_LEVEL || "info"
   */
  level?: LoggerOptions["level"];

  /**
   * Logger output format.
   * Use "json" in production/container logs.
   * @default process.env.ARCSCORD_LOG_FORMAT || process.env.LOG_FORMAT || "pretty"
   */
  format?: LoggerOptions["format"];

  /**
   * Optional secondary output for detailed error diagnostics.
   * Console logs stay readable while diagnostics can be stored elsewhere.
   *
   * @example
   * ```ts
   * const diagnostics: string[] = [];
   *
   * const client = new ArcClient(process.env.DISCORD_TOKEN!, {
   *   intents: [],
   *   logger: {
   *     level: "info",
   *     format: "pretty",
   *     diagnostics: {
   *       enabled: true,
   *       format: "json",
   *       loggerFunc: line => diagnostics.push(String(line)),
   *     },
   *   },
   * });
   * ```
   */
  diagnostics?: LoggerOptions["diagnostics"];
};

/**
 * Represents options for an ArcClient.
 */
export type ArcClientOptions = ClientOptions & {
  /**
   * Discord application id used to register commands before the client is ready.
   *
   * When provided, command registration can use the REST API directly instead
   * of waiting for Discord.js to hydrate `client.application`.
   */
  applicationId?: string;

  /**
   * Options for configuring the logger.
   */
  logger?: ArcClientLoggerOptions;

  /**
   * List of base messages
   */
  baseMessages?: MessageOptions;

  /**
   * Optional configuration object for specifying manager options.
   * This can be used to customize behavior or settings related to managers.
   */
  managers?: ManagersOptions;

  /**
   * if you want the lib trace logs
   * @default false
   */
  enableInternalTrace?: boolean;

  /**
   * Default timeout and check interval used by {@link ArcClient.waitReady}.
   * These defaults also apply to internal framework calls.
   */
  waitReady?: WaitReadyOptions;
};

/**
 * Options used by {@link ArcClient.waitReady}.
 */
export type WaitReadyOptions = {
  /**
   * Maximum time to wait for the client to become ready, in milliseconds.
   * @default 30000
   */
  timeout?: number;

  /**
   * Delay between readiness checks, in milliseconds.
   * @default 50
   */
  checkInterval?: number;
};

/**
 * configurations for arcscord managers
 */
export type ManagersOptions = {
  /**
   * Configuration of {@link LocaleManager} for customize localization of arcscord
   */
  locale?: LocaleManagerOptions;

  /**
   * Configuration of {@link CommandManager} for customize command behavior
   */
  command?: CommandManagerOptions;

  /**
   * Configuration of {@link EventManager} for customize event behavior
   */
  event?: EventManagerOptions;

  /**
   * Configuration of {@link ComponentManager} for customize component behavior
   */
  component?: ComponentManagerOptions;
};

/**
 * Context passed to user-visible Arcscord message builders.
 */
export type BaseMessageContext = {
  /**
   * Detected i18next language for the interaction when available.
   */
  locale?: string;

  /**
   * Fixed i18next translation function for `locale`.
   */
  t?: typeof i18next.t;
};

/**
 * List of base options
 */
export type MessageOptions = {
  /**
   * Message if an internal error happen
   * @param errId the error id
   */
  error?: (errId?: string, context?: BaseMessageContext) => BaseMessageOptions;
};

/**
 * List of handlers
 */
export type HandlersList = {
  /**
   * List of commands
   */
  commands?: Command[];
  /**
   * List of components
   */
  components?: ComponentHandler[];
  /**
   * List of events
   */
  events?: AnyEventHandler[];
};

/**
 * Number of handlers loaded per category by {@link ArcClient.loadHandlers}.
 */
export type HandlersLoadReport = {
  /**
   * Number of commands loaded.
   */
  commands: number;
  /**
   * Number of components loaded.
   */
  components: number;
  /**
   * Number of events loaded.
   */
  events: number;
};
