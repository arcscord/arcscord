import type { Result } from "@arcscord/error";
import type { BaseMessageOptions, BitFieldResolvable, GatewayIntentsString } from "discord.js";
import type { ArcClientOptions, BaseMessageContext, HandlersList, MessageOptions } from "#/base/client/client.type";
import type { Command } from "#/base/command/command_definition.type";
import type { ComponentHandler } from "#/base/components/interaction/component_handlers.type";
import type { AnyEventHandler } from "#/base/event/event.type";
import type { InternalError } from "#/utils/error/class/internal_error";
import type { LoggerConstructor, LoggerInterface } from "#/utils/logger/logger.type";
import { error, ok } from "@arcscord/error";
import { Client as DJSClient, EmbedBuilder, REST } from "discord.js";
import { ComponentManager } from "#/manager";
import { CommandManager } from "#/manager/command/command_manager.class";
import { EventManager } from "#/manager/event/event_manager.class";
import { LocaleManager } from "#/manager/locale/locale_manager.class";
import { ArcLogger } from "#/utils/logger/logger.class";
import { createLogger } from "#/utils/logger/logger.util";

export class ArcClient extends DJSClient {
  /**
   * The manager for commands
   */
  commandManager: CommandManager;

  /**
   * The manager for events
   */
  eventManager: EventManager;

  /**
   * The manager for components
   */
  componentManager: ComponentManager;

  /**
   * The manager for localization
   */
  localeManager: LocaleManager;

  /**
   * The logger instance
   */
  logger: LoggerInterface;

  /**
   * REST handler for Discord API
   */
  rest: REST;

  /**
   * Indicates if the client is ready
   */
  ready = false;

  /**
   * Additional options for configuring the client
   */
  arcOptions: ArcClientOptions;

  /**
   * Default messages for various operations
   */
  defaultMessages: Required<MessageOptions>;

  /**
   * Constructor function for the logger
   */
  loggerConstructor: LoggerConstructor;

  /**
   * Constructor for creating an instance of the ArcClient class.
   *
   * @param token - The authentication token for the bot.
   * @param options - Additional options for configuring the client.
   */
  constructor(token: string, options: ArcClientOptions) {
    super(options);

    this.loggerConstructor = options.logger?.customLogger ?? ArcLogger;

    this.logger = createLogger(
      this.loggerConstructor,
      "main",
      options.logger?.loggerFunc,
      options.logger,
    );

    this.defaultMessages = Object.assign<
      Required<MessageOptions>,
      MessageOptions | undefined
    >(
      {
        error: (errId?: string) => {
          return {
            embeds: [
              new EmbedBuilder()
                .setTitle("Internal Error.")
                .setColor("Orange")
                .setDescription(
                  `A internal error happen, error id ${errId}, please contact bot owner if error repeat`,
                ),
            ],
          };
        },
      },
      options.baseMessages,
    );

    this.arcOptions = {
      enableInternalTrace: false,
      ...options,
    };

    this.commandManager = new CommandManager(this, options.managers?.command);
    this.eventManager = new EventManager(this, options.managers?.event);
    this.componentManager = new ComponentManager(this, options.managers?.component);
    this.localeManager = new LocaleManager(this, options.managers?.locale);
    this.trace("created managers");

    this.token = token;

    this.rest = new REST({
      version: "10",
    }).setToken(token);

    this.on("clientReady", () => {
      this.trace("bot connected...");
      this.ready = true;
    });
  }

  /**
   * Waits until the client is ready
   *
   * @param delay - The delay in milliseconds between each check
   * @returns A promise that resolves when the client is ready
   */
  waitReady(delay = 50): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = (): void => {
        if (this.ready) {
          return resolve();
        }
        setTimeout(checkReady, delay);
      };
      checkReady();
    });
  }

  /**
   * Creates a new logger instance with the provided name
   *
   * @param name - The name for the logger
   * @returns A new logger instance
   */
  createLogger(name: string): LoggerInterface {
    return createLogger(
      this.loggerConstructor,
      name,
      this.arcOptions.logger?.loggerFunc,
      this.arcOptions.logger,
    );
  }

  /**
   * Loads and registers commands
   *
   * @param commands - The commands to load
   * @param group - The group to assign the commands to
   * @param guild - The guild to register the commands in (optional)
   */
  async loadCommands(
    commands: Command[],
    group = "default",
    guild?: string,
  ): Promise<Result<true, InternalError>> {
    await this.localeManager.ready;
    const [err, data] = this.commandManager.loadCommands(commands, group);
    if (err) {
      return error(err);
    }
    const [err2, data2] = guild
      ? await this.commandManager.pushGuildCommands(guild, data)
      : await this.commandManager.pushGlobalCommands(data);

    if (err2) {
      return error(err2);
    }

    this.commandManager.resolveCommands(commands, data2);
    return ok(true);
  }

  /**
   * Loads and registers events
   *
   * @param events - The events to load
   * @returns The number of loaded event handlers.
   */
  loadEvents(events: AnyEventHandler[]): Promise<number> {
    return this.eventManager.loadEvents(events);
  }

  /**
   * Loads and registers components
   *
   * @param components - The components to load
   */
  loadComponents(components: ComponentHandler[]): number {
    return this.componentManager.loadComponents(components);
  }

  /**
   * Gets an error message with a specified error ID and locale
   *
   * @param errorId - The ID of the error
   * @returns The error message
   */
  getErrorMessage(errorId?: string, locale?: string): BaseMessageOptions {
    return this.defaultMessages.error(errorId, this.createMessageContext(locale));
  }

  createMessageContext(locale?: string): BaseMessageContext {
    if (!locale || !this.localeManager.enabled) {
      return { locale };
    }

    return {
      locale,
      t: this.localeManager.i18n.getFixedT(locale),
    };
  }

  addIntents(intents: BitFieldResolvable<GatewayIntentsString, number>): void {
    this.options.intents = this.options.intents.add(intents);
  }

  trace(message: string): void {
    if (this.arcOptions.enableInternalTrace) {
      this.logger.trace(message);
    }
  }

  /**
   * Loads and registers handlers
   *
   * @param handlers - The handlers to load
   */
  async loadHandlers(handlers: HandlersList, logs = false): Promise<void> {
    if (handlers.events && handlers.events.length > 0) {
      await this.eventManager.loadEvents(handlers.events);
      if (logs) {
        this.eventManager.logger.info(`Loaded ${handlers.events.length} events`);
      }
    }
    if (handlers.components && handlers.components.length > 0) {
      this.componentManager.loadComponents(handlers.components);
      if (logs) {
        this.componentManager.logger.info(`Loaded ${handlers.components.length} components`);
      }
    }
    if (handlers.commands && handlers.commands.length > 0) {
      if (!this.ready && !this.arcOptions.applicationId) {
        await this.waitReady();
      }
      const [err] = await this.loadCommands(handlers.commands);
      if (err) {
        this.logger.fatalError(err);
      }
      if (logs) {
        this.commandManager.logger.info(`Loaded ${handlers.commands.length} commands`);
      }
    }
  }
}
