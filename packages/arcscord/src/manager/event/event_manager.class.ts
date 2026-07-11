import type { ClientEvents, GatewayIntentsString } from "discord.js";
import type { ArcClient } from "#/base/client/client.class";
import type { AnyEventHandler, EventHandler, EventHandlerForRegistry } from "#/base/event/event.type";
import type {
  EventIntentCheckCoverage,
  EventIntentCheckIssue,
  EventIntentCheckOptions,
  EventManagerOptions,
  EventResultHandlerInfos,
  RequiredEventIntentCheckOptions,
} from "./event_manager.type";
import { EventContext } from "#/base/event/event_context";
import { BaseManager } from "#/base/manager/manager.class";
import { intentsMap } from "#/manager/event/intents_map";
import { ArcscordError, arcscordErrorCodes, executionDefect, normalizeHandlerReturn } from "#/utils";

type EventRegistration = {
  event: EventHandlerForRegistry;
  listener: (...args: unknown[]) => Promise<void>;
};

type NormalizedEventManagerOptions = Omit<Required<EventManagerOptions>, "intentCheck"> & {
  intentCheck: false | RequiredEventIntentCheckOptions;
};

/**
 * Manages event handling for the Discord client.
 */
export class EventManager extends BaseManager {
  readonly options: NormalizedEventManagerOptions;

  private events: Map<string, EventRegistration> = new Map();

  constructor(client: ArcClient, options?: EventManagerOptions) {
    super(client, "event");

    this.options = {
      resultHandler: this.handleResult.bind(this),
      ...options,
      intentCheck: this.normalizeIntentCheckOptions(options?.intentCheck),
    };
  }

  /**
   * Loads and registers a list of event handlers.
   *
   * @param events - An array of event handlers to load.
   * @returns The number of loaded handlers.
   * @throws {@link ArcscordError} when a handler name is duplicated or an intent
   * check is configured to throw.
   */
  async loadEvents(events: AnyEventHandler[]): Promise<number> {
    for (const event of events) {
      await this.loadAnyEvent(event);
    }

    return events.length;
  }

  /**
   * Loads and registers a single event handler.
   *
   * @param event - The event handler to load.
   * @throws {@link ArcscordError} when the handler name is duplicated or an intent
   * check is configured to throw.
   */
  async loadEvent<E extends keyof ClientEvents>(event: EventHandler<E>): Promise<void> {
    if (this.events.has(event.name)) {
      throw new ArcscordError({
        code: arcscordErrorCodes.EventHandlerDuplicate,
        message: `duplicate event handler name "${event.name}"`,
        metadata: { handlerName: event.name, eventName: event.event },
      });
    }

    this.checkIntents(event);

    this.trace(`bind event ${event.event} for ${event.name} handler !`);

    const listener = async (...args: ClientEvents[E]): Promise<void> => {
      if (event.options?.once) {
        this.events.delete(event.name);
      }

      const beforeReady = event.options?.beforeReady ?? "run";
      if (!this.client.ready) {
        if (beforeReady === "drop") {
          return;
        }
        if (beforeReady === "queue") {
          await this.client.waitReady();
        }
      }

      await this.runEvent(event, args);
    };

    this.events.set(event.name, {
      event: event as unknown as EventHandlerForRegistry,
      listener: listener as (...args: unknown[]) => Promise<void>,
    });

    if (event.options?.once) {
      this.client.once(event.event, listener);
    }
    else {
      this.client.on(event.event, listener);
    }
  }

  /**
   * Removes a loaded event handler by name.
   *
   * @param name - The event handler name to unload.
   * @returns `true` when a listener was removed.
   */
  unloadEvent(name: string): boolean {
    const registration = this.events.get(name);
    if (!registration) {
      return false;
    }

    this.client.off(registration.event.event, registration.listener);
    this.events.delete(name);
    this.trace(`unloaded event ${registration.event.event} for ${name} handler !`);

    return true;
  }

  /**
   * Default result handler. Logs errors; successful runs are silent.
   */
  async handleResult(infos: EventResultHandlerInfos): Promise<void> {
    const meta = {
      handler: infos.event.name,
      event: infos.eventName,
      durationMs: infos.durationMs,
      incidentId: infos.incidentId,
    };
    if (infos.exit.status === "defect") {
      const incidentId = infos.incidentId ?? crypto.randomUUID();
      this.logger.logError(infos.exit.defect, { ...meta, incidentId });
      return;
    }
    if (infos.exit.status === "failure") {
      this.logger.logError(infos.exit.failure, meta);
      return;
    }
    if (infos.exit.status === "interrupted") {
      this.logger.warn("Event execution interrupted", meta);
    }
  }

  private async runEvent<E extends keyof ClientEvents>(
    event: EventHandler<E>,
    args: ClientEvents[E],
  ): Promise<void> {
    const startedAt = Date.now();
    try {
      const context = new EventContext(this.client, event);
      const rawResult = await event.run(context, ...args);
      this.logger.debug(`Event handled: ${event.name}`, {
        handler: event.name,
        event: event.event,
      });
      const endedAt = Date.now();
      await this.options.resultHandler({
        exit: normalizeHandlerReturn(rawResult),
        event: event as unknown as AnyEventHandler,
        eventName: event.event,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
      });
    }
    catch (e) {
      const endedAt = Date.now();
      await this.options.resultHandler({
        exit: executionDefect(e),
        event: event as unknown as AnyEventHandler,
        eventName: event.event,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        incidentId: crypto.randomUUID(),
      });
    }
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

  private checkIntents<E extends keyof ClientEvents>(event: EventHandler<E>): void {
    if (this.options.intentCheck === false || this.options.intentCheck.ignore.includes(event.event)) {
      return;
    }

    const issue = this.resolveIntentIssue(event);
    if (!issue) {
      return;
    }

    const action = issue.type === "missing"
      ? this.options.intentCheck.missing
      : this.options.intentCheck.partialCoverage;

    if (action === "off") {
      return;
    }

    if (action === "warn") {
      this.logger.warn(issue.message);
      return;
    }

    throw new ArcscordError({
      code: arcscordErrorCodes.EventIntentMissing,
      message: issue.message,
      metadata: {
        handlerName: event.name,
        eventName: event.event,
        missingIntents: issue.missing,
        presentIntents: issue.present,
      },
    });
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

  private async loadAnyEvent(event: AnyEventHandler): Promise<void> {
    await this.loadEvent(event as unknown as EventHandler<keyof ClientEvents>);
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
