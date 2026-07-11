import type { Result } from "@arcscord/error";
import type { ClientEvents } from "discord.js";
import type { EventContext } from "#/base/event/event_context";
import type { MaybePromise } from "#/utils";

/**
 * Normalized internal result of an event handler.
 * Used by the manager after normalizing the raw return value of `run()`.
 */
export type EventHandleResult<E = unknown> = Result<string | true, E>;

/**
 * All values an event `run()` function may return.
 *
 * The manager normalizes these to an {@link EventHandleResult} before calling
 * the result handler:
 * - `void` / `undefined` → `ok(true)`
 * - `string` or `true` → `ok(value)`
 * - `Result<string | true, E>` → normalized as an expected failure or success
 */
export type EventHandleReturn<E = unknown>
  = | void
    | string
    | true
    | EventHandleResult<E>;

/**
 * Controls how an event received before {@link ArcClient.waitReady} completes
 * is handled.
 *
 * - `run`: execute the handler immediately.
 * - `queue`: wait for the client to be ready, then execute the handler.
 * - `drop`: ignore the event.
 */
export type EventBeforeReadyMode = "run" | "queue" | "drop";

/**
 * Options for configuring event handlers.
 */
export type EventHandlerOptions = {
  /**
   * Controls how events received before the client is ready are handled.
   *
   * @default "run"
   */
  beforeReady?: EventBeforeReadyMode;

  /**
   * Register this handler with `client.once` instead of `client.on`.
   * The handler is removed from the manager registry after its first run.
   *
   * @default false
   */
  once?: boolean;
};

/**
 * Represents an event handler for a specific Discord client event.
 */
export type EventHandler<E extends keyof ClientEvents> = {
  /**
   * The name of the event.
   */
  event: E;

  /**
   * The name of the event handler.
   */
  name: string;

  /**
   * Optional configuration object for the event handler.
   */
  options?: EventHandlerOptions;

  /**
   * The function to run when the event is triggered.
   *
   * May return `void`, a plain `string`, `true`, or a full
   * `Result<string | true, E>`. The manager normalizes all forms
   * before calling the result handler.
   *
   * @param ctx - The event context.
   * @param args - The arguments for the event.
   */
  run: (
    ctx: EventContext<E>,
    ...args: ClientEvents[E]
  ) => MaybePromise<EventHandleReturn>;
};

/**
 * Union of all supported event handlers.
 *
 * Use this type for collections that can contain handlers for different
 * Discord events, such as handler lists and `loadEvents` inputs.
 */
export type AnyEventHandler = {
  [E in keyof ClientEvents]: EventHandler<E>;
}[keyof ClientEvents];

/**
 * Type-erased event handler used by manager registries and diagnostics.
 *
 * @internal
 */
export type EventHandlerForRegistry = {
  event: keyof ClientEvents;
  name: string;
  options?: EventHandlerOptions;
  run: (
    ctx: EventContext,
    ...args: unknown[]
  ) => MaybePromise<EventHandleReturn>;
};
