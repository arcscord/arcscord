import type { Result } from "@arcscord/error";
import type { ClientEvents, GatewayIntentsString } from "discord.js";
import type { ArcClient } from "#/base/client/client.class";
import type {
  AnyEventHandler,
  AnyLoadableEventHandler,
  AnySourceEventHandler,
  EventHandler,
  EventHandlerForRegistry,
  SourceEventHandler,
} from "#/base/event/event.type";
import type {
  EventSource,
  EventSourceArgs,
  EventSourceEvent,
} from "#/base/event/event_source";
import type {
  AnyEventExecutionContext,
  AnySourceEventExecutionContext,
  EventDispatcher,
  EventDispatchResult,
  EventExecutionHandler,
  EventExecutionOutcome,
  EventIntentCheckCoverage,
  EventIntentCheckIssue,
  EventIntentCheckOptions,
  EventManagerOptions,
  EventResultHandler,
  EventResultHandlerInfos,
  RequiredEventIntentCheckOptions,
  SourceEventExecutionHandler,
} from "./event_manager.type";
import { error, ok } from "@arcscord/error";
import { EventContext } from "#/base/event/event_context";
import { gatewayEvents } from "#/base/event/event_source";
import { createExecutionControls } from "#/base/manager/execution_handler";
import { BaseManager } from "#/base/manager/manager.class";
import { intentsMap } from "#/manager/event/intents_map";
import { ArcscordError, arcscordErrorCodes, executionDefect, normalizeHandlerReturn } from "#/utils";
import {
  defaultEventExecutionHandler,
  defaultSourceEventExecutionHandler,
  eventResultHandlerAdapter,
  runDefaultEventExecution,
} from "./event_execution_handler";

type EventRegistration = {
  source: EventSource;
  event: EventHandlerForRegistry;
  listener: (...args: unknown[]) => Promise<EventExecutionOutcome>;
};

type NormalizedEventManagerOptions = {
  executionHandlers: readonly EventExecutionHandler[];
  sourceExecutionHandlers: readonly SourceEventExecutionHandler[];
  resultHandler: EventResultHandler;
  intentCheck: false | RequiredEventIntentCheckOptions;
};

/**
 * Manages event handling for the Discord client.
 */
export class EventManager extends BaseManager {
  readonly options: NormalizedEventManagerOptions;

  private events: Map<symbol, Map<string, EventRegistration>> = new Map();

  private readonly preExecutionResultHandler?: EventResultHandler;

  private readonly useDefaultPreExecutionHandler: boolean;

  constructor(client: ArcClient, options?: EventManagerOptions) {
    super(client, "event");

    if (options?.executionHandlers !== undefined && options.resultHandler !== undefined) {
      throw new TypeError("event executionHandlers and resultHandler are mutually exclusive");
    }

    const executionHandlers = options?.executionHandlers
      ?? (options?.resultHandler
        ? [eventResultHandlerAdapter(options.resultHandler)]
        : [defaultEventExecutionHandler]);

    this.preExecutionResultHandler = options?.resultHandler;
    this.useDefaultPreExecutionHandler = options?.executionHandlers === undefined
      && options?.resultHandler === undefined;

    this.options = {
      executionHandlers,
      sourceExecutionHandlers: options?.sourceExecutionHandlers
        ?? [defaultSourceEventExecutionHandler],
      resultHandler: options?.resultHandler ?? this.defaultResultHandler.bind(this),
      intentCheck: this.normalizeIntentCheckOptions(options?.intentCheck),
    };
  }

  /**
   * Loads and registers a list of event handlers.
   *
   * Loading stops at the first duplicate handler or unmet intent requirement and
   * returns the failure; every handler before it stays loaded.
   *
   * @param events - An array of event handlers to load.
   * @returns The number of loaded handlers, or the loading failure.
   */
  async loadEvents(
    events: AnyLoadableEventHandler[],
  ): Promise<Result<number, ArcscordError<"EVENT_HANDLER_DUPLICATE" | "EVENT_INTENT_MISSING">>> {
    let loaded = 0;
    for (const event of events) {
      const [err] = await this.loadAnyEvent(event);
      if (err !== null) {
        return error(err);
      }
      loaded++;
    }

    return ok(loaded);
  }

  /**
   * Loads and registers a single event handler.
   *
   * @param event - The event handler to load.
   * @returns `ok(true)` when loaded, or the duplication/intent failure.
   */
  async loadEvent<E extends keyof ClientEvents>(
    event: EventHandler<E>,
  ): Promise<Result<true, ArcscordError<"EVENT_HANDLER_DUPLICATE" | "EVENT_INTENT_MISSING">>>;
  async loadEvent<
    Source extends EventSource,
    E extends EventSourceEvent<NoInfer<Source>>,
  >(
    event: SourceEventHandler<Source, E>,
  ): Promise<Result<true, ArcscordError<"EVENT_HANDLER_DUPLICATE" | "EVENT_INTENT_MISSING">>>;
  async loadEvent(
    event: AnyLoadableEventHandler,
  ): Promise<Result<true, ArcscordError<"EVENT_HANDLER_DUPLICATE" | "EVENT_INTENT_MISSING">>> {
    const source = this.eventSource(event);
    const registry = this.sourceRegistry(source, true)!;

    if (registry.has(event.name)) {
      return error(new ArcscordError({
        code: arcscordErrorCodes.EventHandlerDuplicate,
        message: `duplicate event handler name "${event.name}"`,
        metadata: {
          handlerName: event.name,
          eventName: event.event,
        },
      }));
    }

    const [intentErr] = this.checkIntents(event, source);
    if (intentErr !== null) {
      return error(intentErr);
    }

    let registration: EventRegistration;
    const listener = (...args: unknown[]): Promise<EventExecutionOutcome> => (
      this.receiveEvent(registration, args)
    );
    registration = {
      source,
      event: event as unknown as EventHandlerForRegistry,
      listener,
    };
    registry.set(event.name, registration);

    if (source.id === gatewayEvents.id) {
      this.trace(`bind event ${event.event} for ${event.name} handler !`);
      this.bindGatewayEvent(registration);
    }
    else {
      this.trace(`register ${source.name} event ${event.event} for ${event.name} handler !`);
    }

    return ok(true);
  }

  /**
   * Dispatches one event independently of Discord.js.
   *
   * Matching handlers run sequentially in registration order.
   */
  async dispatch<
    Source extends EventSource,
    E extends EventSourceEvent<NoInfer<Source>>,
  >(
    source: Source,
    eventName: E,
    ...args: EventSourceArgs<Source, E>
  ): Promise<EventDispatchResult<Source, E>> {
    this.assertEventSource(source);

    const registrations = [...(this.sourceRegistry(source, false)?.values() ?? [])]
      .filter(registration => registration.event.event === eventName);
    const executions = [];

    for (const registration of registrations) {
      const outcome = await registration.listener(...args);
      executions.push({
        event: registration.event as unknown as AnyLoadableEventHandler,
        outcome,
      });
    }

    return {
      source,
      eventName,
      matched: registrations.length,
      executions,
    };
  }

  /** Returns a typed dispatcher permanently bound to one source. */
  dispatcher<Source extends EventSource>(source: Source): EventDispatcher<Source> {
    this.assertEventSource(source);
    return (event, ...args) => this.dispatch(source, event, ...args);
  }

  /**
   * Removes a loaded Gateway handler by name.
   *
   * @param name - The event handler name to unload.
   * @returns `true` when a listener was removed.
   */
  unloadEvent(name: string): boolean;
  /** Removes a loaded handler from a custom source. */
  unloadEvent(source: EventSource, name: string): boolean;
  unloadEvent(sourceOrName: EventSource | string, customName?: string): boolean {
    const source = typeof sourceOrName === "string" ? gatewayEvents : sourceOrName;
    const name = typeof sourceOrName === "string" ? sourceOrName : customName!;
    const registry = this.sourceRegistry(source, false);
    const registration = registry?.get(name);
    if (!registration) {
      return false;
    }

    if (source.id === gatewayEvents.id) {
      this.unbindGatewayEvent(registration);
    }
    registry!.delete(name);
    if (registry!.size === 0) {
      this.events.delete(source.id);
    }
    this.trace(`unloaded ${source.name} event ${registration.event.event} for ${name} handler !`);

    return true;
  }

  /**
   * Default result handler. Logs errors; successful runs are silent.
   *
   * A custom `resultHandler` can call this to reuse the default behavior after
   * running its own logic: `return manager.defaultResultHandler(infos)`.
   *
   * @deprecated Use {@link defaultEventExecutionHandler} in
   * `executionHandlers`.
   */
  async defaultResultHandler(infos: EventResultHandlerInfos): Promise<void> {
    runDefaultEventExecution(infos, {
      kind: "completed",
      exit: infos.exit,
      startedAt: infos.startedAt,
      endedAt: infos.endedAt,
      durationMs: infos.durationMs,
      incidentId: infos.incidentId,
    }, this);
  }

  private async runEvent(
    event: EventHandlerForRegistry,
    source: EventSource,
    args: unknown[],
  ): Promise<EventExecutionOutcome> {
    if (source.id === gatewayEvents.id) {
      return this.runGatewayEvent(event, args);
    }

    return this.runSourceEvent(event, source, args);
  }

  private async runGatewayEvent(
    event: EventHandlerForRegistry,
    args: unknown[],
  ): Promise<EventExecutionOutcome> {
    const startedAt = Date.now();
    const context = new EventContext(
      this.client,
      event as unknown as EventHandler<keyof ClientEvents>,
      gatewayEvents,
      this.logger,
    );
    const execution = {
      event,
      eventName: event.event,
      source: gatewayEvents,
      context,
      args,
      ...createExecutionControls<string | true>(startedAt),
    } as unknown as AnyEventExecutionContext;

    const outcome = await this.runExecutionHandlers(
      this.options.executionHandlers,
      execution,
      () => this.executeEvent(execution, event),
      this,
    );
    if (outcome) {
      return outcome;
    }

    return execution.complete(executionDefect(
      new Error(`event execution handler failed for "${event.name}"`),
    ));
  }

  private async runSourceEvent(
    event: EventHandlerForRegistry,
    source: EventSource,
    args: unknown[],
  ): Promise<EventExecutionOutcome> {
    const startedAt = Date.now();
    type RegistrySource = EventSource<Record<string, readonly unknown[]>>;
    const context = new EventContext<string, RegistrySource>(
      this.client,
      event as unknown as SourceEventHandler<RegistrySource, string>,
      source as RegistrySource,
      this.logger,
    );
    const execution = {
      event: event as unknown as AnySourceEventHandler,
      eventName: event.event,
      source,
      context,
      args,
      ...createExecutionControls<string | true>(startedAt),
    } as AnySourceEventExecutionContext;

    const outcome = await this.runExecutionHandlers(
      this.options.sourceExecutionHandlers,
      execution,
      () => this.executeEvent(execution, event),
      this,
    );
    if (outcome) {
      return outcome;
    }

    return execution.complete(executionDefect(
      new Error(`event execution handler failed for "${event.name}"`),
    ));
  }

  private async executeEvent(
    execution: AnyEventExecutionContext | AnySourceEventExecutionContext,
    event: EventHandlerForRegistry,
  ): Promise<EventExecutionOutcome> {
    try {
      const rawResult = await event.run(
        execution.context as EventContext,
        ...execution.args as unknown[],
      );
      this.logger.debug(`Event handled: ${event.name}`, {
        handler: event.name,
        event: event.event,
        source: execution.source?.name ?? gatewayEvents.name,
      });
      return execution.complete(normalizeHandlerReturn(rawResult));
    }
    catch (e) {
      return execution.complete(executionDefect(e));
    }
  }

  private async receiveEvent(
    registration: EventRegistration,
    args: unknown[],
  ): Promise<EventExecutionOutcome> {
    const receivedAt = Date.now();
    const controls = createExecutionControls<string | true>(receivedAt);
    const { event, source } = registration;

    if (event.options?.once) {
      this.unloadEvent(source, event.name);
    }

    const beforeReady = event.options?.beforeReady ?? "run";
    if (!this.client.ready) {
      if (beforeReady === "drop") {
        return controls.cancel();
      }
      if (beforeReady === "queue") {
        try {
          await this.client.waitReady();
        }
        catch (e) {
          const exit = executionDefect(e);
          const outcome = controls.complete(exit);
          if (source.id === gatewayEvents.id) {
            const infos: EventResultHandlerInfos = {
              exit,
              event: event as unknown as AnyEventHandler,
              eventName: event.event,
              source: gatewayEvents,
              startedAt: outcome.startedAt,
              endedAt: outcome.endedAt,
              durationMs: outcome.durationMs,
              incidentId: outcome.incidentId,
            };
            if (this.preExecutionResultHandler) {
              await this.runResultHandler(() => this.preExecutionResultHandler!(infos, this));
            }
            else if (this.useDefaultPreExecutionHandler) {
              runDefaultEventExecution(infos, outcome, this);
            }
            else {
              this.logger.logError(exit.defect, { source: "eventBeforeReady" });
            }
          }
          else {
            this.logger.logError(exit.defect, {
              source: "eventBeforeReady",
              eventSource: source.name,
            });
          }
          return outcome;
        }
      }
    }

    return this.runEvent(event, source, args);
  }

  private eventSource(event: AnyLoadableEventHandler | EventHandlerForRegistry): EventSource {
    return event.source ?? gatewayEvents;
  }

  private sourceRegistry(
    source: EventSource,
    create: boolean,
  ): Map<string, EventRegistration> | undefined {
    const current = this.events.get(source.id);
    if (current || !create) {
      return current;
    }

    const registry = new Map<string, EventRegistration>();
    this.events.set(source.id, registry);
    return registry;
  }

  private assertEventSource(source: EventSource): void {
    if (
      typeof source !== "object"
      || source === null
      || typeof source.name !== "string"
      || source.name.length === 0
      || typeof source.id !== "symbol"
    ) {
      throw new TypeError("invalid event source");
    }
  }

  private bindGatewayEvent(registration: EventRegistration): void {
    const client = this.client;
    if (registration.event.options?.once) {
      client.once(registration.event.event, registration.listener);
    }
    else {
      client.on(registration.event.event, registration.listener);
    }
  }

  private unbindGatewayEvent(registration: EventRegistration): void {
    const client = this.client;
    client.off(registration.event.event, registration.listener);
  }

  private normalizeIntentCheckOptions(
    options: false | EventIntentCheckOptions | undefined,
  ): false | RequiredEventIntentCheckOptions {
    if (options === false) {
      return false;
    }

    return {
      missing: options?.missing ?? "warn",
      partialCoverage: options?.partialCoverage ?? "off",
      coverage: {
        guild: options?.coverage?.guild ?? true,
        dm: options?.coverage?.dm ?? true,
      },
      ignore: options?.ignore ?? [],
    };
  }

  private checkIntents(
    event: AnyLoadableEventHandler,
    source: EventSource,
  ): Result<true, ArcscordError<"EVENT_INTENT_MISSING">> {
    if (source.id !== gatewayEvents.id || this.options.intentCheck === false) {
      return ok(true);
    }

    const gatewayEvent = event as unknown as EventHandler<keyof ClientEvents>;
    if (this.options.intentCheck.ignore.includes(gatewayEvent.event)) {
      return ok(true);
    }

    const issue = this.resolveIntentIssue(gatewayEvent);
    if (!issue) {
      return ok(true);
    }

    const action = issue.type === "missing"
      ? this.options.intentCheck.missing
      : this.options.intentCheck.partialCoverage;

    if (action === "off") {
      return ok(true);
    }

    if (action === "warn") {
      this.logger.warn(issue.message);
      return ok(true);
    }

    return error(new ArcscordError({
      code: arcscordErrorCodes.EventIntentMissing,
      message: issue.message,
      metadata: {
        handlerName: event.name,
        eventName: event.event,
        missingIntents: issue.missing,
        presentIntents: issue.present,
      },
    }));
  }

  private resolveIntentIssue<E extends keyof ClientEvents>(event: EventHandler<E>): EventIntentCheckIssue | null {
    const requirement = intentsMap[event.event];
    if (requirement.mode === "none") {
      return null;
    }

    const requiredIntents = this.getRequirementIntents(requirement);
    const present = requiredIntents.filter(intent => this.client.options.intents.has(intent));
    const missing = requiredIntents.filter(intent => !this.client.options.intents.has(intent));

    if (requirement.mode === "all" && missing.length > 0) {
      return {
        type: "missing",
        event: event as unknown as AnyEventHandler,
        requirement,
        present,
        missing,
        message: [
          `Missing intent${missing.length > 1 ? "s" : ""} for event "${event.event}" in handler "${event.name}": ${missing.join(", ")}.`,
          `Required intents: ${requiredIntents.join(", ")}.`,
        ].join(" "),
      };
    }

    if (requirement.mode === "oneOf" && present.length === 0) {
      return {
        type: "missing",
        event: event as unknown as AnyEventHandler,
        requirement,
        present,
        missing,
        message: [
          `Missing intent for event "${event.event}" in handler "${event.name}".`,
          `Add at least one of: ${requiredIntents.join(", ")}.`,
        ].join(" "),
      };
    }

    if (requirement.mode === "oneOf") {
      if (this.options.intentCheck === false) {
        return null;
      }

      const missingCoverage = Object
        .entries(requirement.intents)
        .filter(([target, intent]) => (
          this.options.intentCheck !== false
          && this.options.intentCheck.coverage[target as keyof typeof this.options.intentCheck.coverage] === true
          && typeof intent === "string"
          && !this.client.options.intents.has(intent)
        ))
        .map(([target]) => target as keyof EventIntentCheckCoverage);
      const expectedMissing = missingCoverage
        .map(target => requirement.intents[target])
        .filter((intent): intent is GatewayIntentsString => typeof intent === "string");

      if (expectedMissing.length === 0) {
        return null;
      }

      return {
        type: "partialCoverage",
        event: event as unknown as AnyEventHandler,
        requirement,
        present,
        missing: expectedMissing,
        missingCoverage,
        message: [
          `Partial intent coverage for event "${event.event}" in handler "${event.name}".`,
          `Configured: ${present.join(", ")}.`,
          `Missing expected coverage: ${missingCoverage.join(", ")} (${expectedMissing.join(", ")}).`,
        ].join(" "),
      };
    }

    return null;
  }

  private async loadAnyEvent(
    event: AnyLoadableEventHandler,
  ): Promise<Result<true, ArcscordError<"EVENT_HANDLER_DUPLICATE" | "EVENT_INTENT_MISSING">>> {
    return this.loadEvent(event as unknown as EventHandler<keyof ClientEvents>);
  }

  private getRequirementIntents(
    requirement: Exclude<typeof intentsMap[keyof ClientEvents], { mode: "none" }>,
  ): GatewayIntentsString[] {
    if (requirement.mode === "all") {
      return requirement.intents;
    }

    return Object
      .values(requirement.intents)
      .filter((intent): intent is GatewayIntentsString => typeof intent === "string");
  }
}
