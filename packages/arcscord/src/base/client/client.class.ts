import type { Result } from "@arcscord/error";
import type { RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import type { BaseMessageOptions, BitFieldResolvable, GatewayIntentsString } from "discord.js";
import type {
  ArcClientOptions,
  BaseMessageContext,
  HandlersList,
  HandlersLoadReport,
  HandlersState,
  MessageOptions,
  WaitReadyOptions,
} from "#/base/client/client.type";
import type { Command } from "#/base/command/command_definition.type";
import type { ComponentHandler } from "#/base/components/interaction/component_handlers.type";
import type { AnyLoadableEventHandler } from "#/base/event/event.type";
import type { ApplicationCommandRegistration } from "#/manager/command/command_registration";
import type { ArcscordError } from "#/utils/error/arcscord_error";
import type { LoggerConstructor, LoggerInterface } from "#/utils/logger/logger.type";
import { error, ok } from "@arcscord/error";
import { Client as DJSClient, EmbedBuilder, REST } from "discord.js";
import { gatewayEvents } from "#/base/event/event_source";
import { ComponentManager } from "#/manager";
import { CommandManager } from "#/manager/command/command_manager.class";
import { EventManager } from "#/manager/event/event_manager.class";
import { LocaleManager } from "#/manager/locale/locale_manager.class";
import { ArcClientReadyTimeoutError } from "#/utils/error/class/client_ready_timeout_error";
import { ArcLogger } from "#/utils/logger/logger.class";
import { createLogger } from "#/utils/logger/logger.util";

/**
 * The arcscord client. Extends the discord.js {@link https://discord.js.org/docs/packages/discord.js/main/Client:Class | Client}
 * and wires up the command, event, component and locale managers plus the logger,
 * driving the whole interaction pipeline.
 *
 * Configure it through {@link ArcClientOptions} (intents, managers, logger, default
 * messages). It is the entry point of every bot built with arcscord.
 *
 * @example
 * ```ts
 * const client = new ArcClient({ intents: [...] });
 * await client.login(process.env.TOKEN);
 * ```
 */
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

  /** State of the latest atomic handler-loading operation. */
  handlersState: HandlersState = "idle";

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
                  `An internal error occurred. Error ID: ${errId}. Please contact the bot owner if the error recurs.`,
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
   * Waits until the client is ready.
   *
   * Passing a number is supported for backward compatibility and configures the
   * delay between checks. Prefer the options object for new code.
   *
   * @param options - Timeout and readiness check interval configuration
   * @returns A promise that resolves when the client is ready
   * @throws {@link ArcClientReadyTimeoutError} When the timeout is reached
   */
  waitReady(options: number | WaitReadyOptions = {}): Promise<void> {
    const callOptions: WaitReadyOptions = typeof options === "number"
      ? { checkInterval: options }
      : options;
    const {
      timeout = 30_000,
      checkInterval = 50,
    } = {
      ...this.arcOptions.waitReady,
      ...callOptions,
    };

    if (!Number.isFinite(timeout) || timeout < 0) {
      throw new RangeError("waitReady timeout must be a finite, non-negative number");
    }
    if (!Number.isFinite(checkInterval) || checkInterval <= 0) {
      throw new RangeError("waitReady checkInterval must be a finite, positive number");
    }

    return new Promise((resolve, reject) => {
      let checkTimer: ReturnType<typeof setTimeout> | undefined;

      const timeoutTimer = setTimeout(() => {
        if (checkTimer) {
          clearTimeout(checkTimer);
        }
        reject(new ArcClientReadyTimeoutError(timeout));
      }, timeout);

      const checkReady = (): void => {
        if (this.ready) {
          clearTimeout(timeoutTimer);
          if (checkTimer) {
            clearTimeout(checkTimer);
          }
          resolve();
          return;
        }
        checkTimer = setTimeout(checkReady, checkInterval);
      };

      checkReady();
    });
  }

  /** Whether Discord is ready and the latest handler batch loaded successfully. */
  isOperational(): boolean {
    return this.isReady() && this.handlersState === "ready";
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
  ): Promise<Result<number, ArcscordError>> {
    await this.localeManager.ready;
    const [err, data] = this.commandManager.loadCommands(commands, group);
    if (err !== null) {
      return error(err);
    }
    const [err2, data2] = guild
      ? await this.commandManager.pushGuildCommands(guild, data)
      : await this.commandManager.pushGlobalCommands(data);

    if (err2 !== null) {
      return error(err2);
    }

    this.commandManager.resolveCommands(commands, data2);
    return ok(commands.length);
  }

  /**
   * Loads and registers events
   *
   * @param events - The events to load
   * @returns The number of loaded event handlers, or the loading failure.
   */
  loadEvents(
    events: AnyLoadableEventHandler[],
  ): Promise<Result<number, ArcscordError<"EVENT_HANDLER_DUPLICATE" | "EVENT_INTENT_MISSING">>> {
    return this.eventManager.loadEvents(events);
  }

  /**
   * Loads and registers components
   *
   * @param components - The components to load
   * @returns The number of loaded components, or the loading failure.
   */
  async loadComponents(
    components: ComponentHandler[],
  ): Promise<Result<number, ArcscordError<"COMPONENT_ROUTE_DUPLICATE" | "COMPONENT_ROUTE_INVALID" | "COMPONENT_VALIDATION_FAILED">>> {
    return this.componentManager.loadComponents(components);
  }

  /**
   * Gets an error message with a specified incident ID and locale
   *
   * @param incidentId - The execution incident ID
   * @returns The error message
   */
  getErrorMessage(incidentId?: string, locale?: string): BaseMessageOptions {
    return this.defaultMessages.error(incidentId, this.createMessageContext(locale));
  }

  /**
   * Builds the message context used to resolve default messages, binding the
   * localization function for `locale` when the locale manager is enabled.
   *
   * @param locale - The locale to bind, if any.
   */
  createMessageContext(locale?: string): BaseMessageContext {
    if (!locale || !this.localeManager.enabled) {
      return { locale };
    }

    return {
      locale,
      t: this.localeManager.i18n.getFixedT(locale),
    };
  }

  /**
   * Adds gateway intents to the client options after construction.
   *
   * @param intents - The intents to add.
   */
  addIntents(intents: BitFieldResolvable<GatewayIntentsString, number>): void {
    this.options.intents = this.options.intents.add(intents);
  }

  /**
   * Emits an internal trace log, but only when `enableInternalTrace` is set in
   * the client options. Used by the framework to trace its own lifecycle.
   *
   * @param message - The trace message.
   */
  trace(message: string): void {
    if (this.arcOptions.enableInternalTrace) {
      this.logger.trace(message);
    }
  }

  /**
   * Loads and registers handlers in one convenience call.
   *
   * The complete batch is validated before local state changes. Commands are
   * then published to Discord before events, components, and resolved commands
   * are registered locally. When command publication must wait for Discord,
   * `clientReady` handlers are registered first so they can observe that
   * lifecycle event. If local registration fails, every local mutation made by
   * this call is rolled back without touching handlers that were loaded
   * previously. A Discord REST mutation that was already accepted cannot always
   * be reversed reliably.
   *
   * Unlike the per-category loaders — which return a {@link Result} — this
   * bootstrap helper fails fast: it **throws** the first {@link ArcscordError}.
   *
   * @param handlers - The handlers to load
   * @param logs - Whether to emit an info log per loaded category
   * @returns The per-category load counts.
   * @throws {@link ArcscordError} on the first loading failure.
   */
  async loadHandlers(handlers: HandlersList, logs = false): Promise<HandlersLoadReport> {
    const commands = handlers.commands ?? [];
    const components = handlers.components ?? [];
    const events = handlers.events ?? [];
    const report: HandlersLoadReport = {
      commands: commands.length,
      components: components.length,
      events: events.length,
    };
    const loadedComponents: ComponentHandler[] = [];
    const loadedEvents: AnyLoadableEventHandler[] = [];
    const previousCommands = new Map(this.commandManager.commands);
    let commandsPublishedLocally = false;

    this.handlersState = "loading";

    try {
      let commandBodies: RESTPostAPIApplicationCommandsJSONBody[] = [];
      if (commands.length > 0) {
        await this.localeManager.ready;
        const [commandErr, bodies] = this.commandManager.loadCommands(commands, "default");
        if (commandErr !== null) {
          throw commandErr;
        }
        commandBodies = bodies;
      }

      const [componentErr] = this.componentManager.validateComponents(components);
      if (componentErr !== null) {
        throw componentErr;
      }

      const [eventErr] = this.eventManager.validateEvents(events);
      if (eventErr !== null) {
        throw eventErr;
      }

      let commandRegistrations: ApplicationCommandRegistration[] = [];
      if (commands.length > 0) {
        if (!this.ready && !this.arcOptions.applicationId) {
          for (const event of events) {
            const source = event.source ?? gatewayEvents;
            if (source.id !== gatewayEvents.id || event.event !== "clientReady") {
              continue;
            }
            const [err] = await this.eventManager.loadEvents([event]);
            if (err !== null) {
              throw err;
            }
            loadedEvents.push(event);
          }
          await this.waitReady();
        }
        const [registrationErr, registrations] = await this.commandManager.pushGlobalCommands(commandBodies);
        if (registrationErr !== null) {
          throw registrationErr;
        }
        commandRegistrations = registrations;
      }

      for (const event of events) {
        if (loadedEvents.includes(event)) {
          continue;
        }
        const [err] = await this.eventManager.loadEvents([event]);
        if (err !== null) {
          throw err;
        }
        loadedEvents.push(event);
      }

      for (const component of components) {
        const [err] = this.componentManager.loadComponent(component);
        if (err !== null) {
          throw err;
        }
        loadedComponents.push(component);
      }

      if (commands.length > 0) {
        commandsPublishedLocally = true;
        this.commandManager.resolveCommands(commands, commandRegistrations);
      }

      this.handlersState = "ready";

      if (logs) {
        if (events.length > 0) {
          this.eventManager.logger.info(`Loaded ${events.length} events`);
        }
        if (components.length > 0) {
          this.componentManager.logger.info(`Loaded ${components.length} components`);
        }
        if (commands.length > 0) {
          this.commandManager.logger.info(`Loaded ${commands.length} commands`);
        }
      }

      return report;
    }
    catch (cause) {
      for (const component of loadedComponents.toReversed()) {
        this.componentManager.unloadComponentHandler(component);
      }
      for (const event of loadedEvents.toReversed()) {
        if (event.source) {
          this.eventManager.unloadEvent(event.source, event.name);
        }
        else {
          this.eventManager.unloadEvent(event.name);
        }
      }
      if (commandsPublishedLocally) {
        this.commandManager.commands.clear();
        for (const [name, command] of previousCommands) {
          this.commandManager.commands.set(name, command);
        }
      }
      this.handlersState = "failed";
      throw cause;
    }
  }
}
