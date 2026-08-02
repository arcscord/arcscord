import type { NonNullish } from "@arcscord/error";
import type { ClientEvents } from "discord.js";
import type { ArcClient, EventHandleResult } from "#/base";
import type {
  EventHandler,
  SourceEventHandler,
} from "#/base/event/event.type";
import type {
  EventSource,
  EventSourceEvent,
  GatewayEventSource,
} from "#/base/event/event_source";
import type { ContextDocs } from "#/base/utils";
import type { LoggerInterface } from "#/utils/logger/logger.type";
import { error, ok } from "@arcscord/error";
import { gatewayEvents } from "#/base/event/event_source";

/** Handler type exposed by an event context for its source and event name. */
export type EventContextHandler<
  E extends string,
  Source extends EventSource,
> = Source extends GatewayEventSource
  ? EventHandler<Extract<E, keyof ClientEvents>>
  : E extends EventSourceEvent<Source>
    ? SourceEventHandler<Source, E>
    : never;

/**
 * The context in which an event handler is executed.
 */
export class EventContext<
  E extends string = keyof ClientEvents,
  Source extends EventSource = typeof gatewayEvents,
> implements Pick<ContextDocs, "client"> {
  client: ArcClient;

  /**
   * The event handler.
   */
  handler: EventContextHandler<E, Source>;

  /** Typed source that delivered this event. */
  source: Source;

  /** Event name within {@link source}. */
  event: E;

  /** Event manager logger shared by every source. */
  logger: LoggerInterface;

  /**
   * Creates an instance of EventContext.
   *
   * @param client - The client instance.
   * @param handler - The event handler.
   */
  constructor(
    client: ArcClient,
    handler: EventContextHandler<E, Source>,
    source: Source = gatewayEvents as unknown as Source,
    logger: LoggerInterface = client.eventManager?.logger ?? client.logger,
  ) {
    this.client = client;
    this.handler = handler;
    this.source = source;
    this.event = handler.event as E;
    this.logger = logger;
  }

  /**
   * Returns a successful result.
   *
   * @param value - The value to wrap in the result. Defaults to `true`.
   * @returns A successful event handle result.
   */
  ok(value: string | true = true): EventHandleResult {
    return ok(value);
  }

  /**
   * Returns an error result.
   *
   * @param failure - The expected failure value.
   * @returns An error event handle result.
   */
  error<Failure extends NonNullish>(failure: Failure): EventHandleResult<Failure> {
    return error(failure);
  }
}
