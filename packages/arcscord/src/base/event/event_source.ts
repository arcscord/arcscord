import type { ClientEvents } from "discord.js";

/** A typed collection of named events and their argument tuples. */
export type EventMap = object;

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
  readonly __events?: Events;
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
export function createEventSource<Events extends EventMap>(
  options: { name: string },
): EventSource<Events> {
  if (!options.name) {
    throw new TypeError("event source name must not be empty");
  }

  return Object.freeze({
    name: options.name,
    id: Symbol(options.name),
  });
}

/** Discord.js Gateway events, used whenever `createEvent` omits `source`. */
export const gatewayEvents: EventSource<ClientEvents> = createEventSource<ClientEvents>({
  name: "discord-gateway",
});
