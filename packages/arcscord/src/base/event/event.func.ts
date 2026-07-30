import type { ClientEvents } from "discord.js";
import type {
  EventHandler,
  EventHandlerOptions,
  SourceEventHandler,
} from "#/base/event/event.type";
import type {
  EventSource,
  EventSourceEvent,
} from "#/base/event/event_source";
import type { OptionalProperties } from "#/utils";

/**
 * Creates an event handler with the given options.
 *
 * @param  options - The options for the event handler.
 * @return The created event handler.
 *
 * @example
 * ```ts
 * const eventHandler = createEvent({
 *   event: "messageCreate",
 *   run: (ctx, message) => {
 *     console.log(`Message received: ${message.content}`);
 *     return ctx.ok();
 *   }
 * });
 * ```
 */
export function createEvent<E extends keyof ClientEvents>(
  options: OptionalProperties<EventHandler<E>, "name">,
): EventHandler<E>;

/**
 * Creates an event handler for a custom typed source.
 *
 * The event arguments are inferred from the supplied `source + event` pair.
 */
export function createEvent<
  Source extends EventSource,
  const E extends EventSourceEvent<NoInfer<Source>>,
>(
  options: OptionalProperties<SourceEventHandler<Source, E>, "name">,
): SourceEventHandler<Source, E>;
export function createEvent(
  options: {
    source?: EventSource;
    event: string;
    name?: string;
    options?: EventHandlerOptions;
    run: (...args: never[]) => unknown;
  },
): unknown {
  if (!options.name) {
    options.name = options.event;
  }
  return options;
}
