import type { ClientEvents } from "discord.js";

/** A typed collection of named events and their argument tuples. */
export type EventMap = object;

declare const gatewayEventSource: unique symbol;

/**
 * Identifies one typed source of events.
 *
 * Sources use their symbol identity at runtime. The optional event-map field is
 * type-only and lets packages expose compatible sources without module
 * augmentation.
 */
export type EventSource<Events extends EventMap = EventMap> = {
  readonly name: string;
  readonly id: symbol;
  /** @internal */
  readonly __events: Events;
};

/**
 * The built-in Discord.js Gateway source.
 *
 * Its private marker prevents another source with a structurally compatible
 * event map from being mistaken for the Gateway source.
 */
export type GatewayEventSource = EventSource<ClientEvents> & {
  readonly [gatewayEventSource]: true;
};

/** Extracts the event map carried by a source. */
export type EventSourceMap<Source extends EventSource>
  = Source extends EventSource<infer Events> ? Events : never;

/** String event names supported by a source. */
export type EventSourceEvent<Source extends EventSource>
  = Extract<keyof EventSourceMap<Source>, string>;

/** Argument tuple associated with one event from a source. */
export type EventSourceArgs<
  Source extends EventSource,
  Event extends EventSourceEvent<Source>,
> = EventSourceMap<Source>[Event] extends readonly unknown[]
  ? EventSourceMap<Source>[Event]
  : never;

/** Creates a uniquely identified typed event source. */
export function createEventSource<
  Events extends EventMap & {
    [Key in keyof Events]: Key extends string ? readonly unknown[] : never;
  },
>(
  options: { name: string },
): EventSource<Events> {
  if (!options.name) {
    throw new TypeError("event source name must not be empty");
  }

  return Object.freeze({
    name: options.name,
    id: Symbol(options.name),
  }) as EventSource<Events>;
}

/** Discord.js Gateway events, used whenever `createEvent` omits `source`. */
export const gatewayEvents = createEventSource<ClientEvents>({
  name: "discord-gateway",
}) as GatewayEventSource;
