import type { ClientEvents } from "discord.js";
import type {
  AnyEventHandler,
  EventHandler,
  SourceEventHandler,
} from "#/base/event/event.type";
import type { EventContext } from "#/base/event/event_context";
import type {
  EventSource,
  EventSourceArgs,
  EventSourceEvent,
  GatewayEventSource,
} from "#/base/event/event_source";
import type {
  ExecutionControls,
  ExecutionNext,
  ExecutionOutcome,
} from "#/base/manager/execution_handler";
import type { EventManager } from "#/manager/event/event_manager.class";
import type { ExecutionExit } from "#/utils/error/execution_exit";
import type { MaybePromise } from "#/utils/type/util.type";
import type { EventIntentCoverageTarget, EventIntentRequirement } from "./intents_map";

/**
 * Shared fields present in event execution contexts and legacy result payloads.
 */
export type BaseEventExecutionInfos = {
  /**
   * The event handler that was executed.
   */
  event: AnyEventHandler;

  /**
   * The Discord.js event name.
   */
  eventName: keyof ClientEvents | string;

  /** Typed source that delivered the event. */
  source: EventSource;
};

/**
 * Payload received by `resultHandler` after every event execution.
 *
 * @deprecated Use {@link EventExecutionContext} and
 * {@link EventExecutionOutcome}.
 */
export type EventResultHandlerInfos = BaseEventExecutionInfos & {
  exit: ExecutionExit<string | true, unknown>;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  incidentId?: string;
};

/** Context exposed to event execution interceptors. */
export type EventExecutionContext<E extends keyof ClientEvents>
  = Omit<BaseEventExecutionInfos, "event" | "eventName">
    & ExecutionControls<string | true, unknown>
    & {
      event: EventHandler<E>;
      eventName: E;
      source: GatewayEventSource;
      context: EventContext<E>;
      args: ClientEvents[E];
    };

/** Execution context for an event from a custom source. */
export type SourceEventExecutionContext<
  Source extends EventSource,
  E extends EventSourceEvent<Source>,
> = ExecutionControls<string | true, unknown> & {
  event: SourceEventHandler<Source, E>;
  eventName: E;
  source: Source;
  context: EventContext<E, Source>;
  args: EventSourceArgs<Source, E>;
};

/**
 * Union of execution contexts for every Discord.js Gateway event.
 *
 * This remains Gateway-correlated for backward-compatible narrowing. Custom
 * source authors can use {@link SourceEventExecutionContext} explicitly.
 */
export type AnyEventExecutionContext = {
  [E in keyof ClientEvents]: EventExecutionContext<E>;
}[keyof ClientEvents];

/** Outcome returned by event execution interceptors. */
export type EventExecutionOutcome = ExecutionOutcome<string | true, unknown>;

/** One handler execution produced by a source dispatch. */
export type EventDispatchExecution = {
  event: AnyEventHandler;
  outcome: EventExecutionOutcome;
};

/** Structured result of dispatching one event from a typed source. */
export type EventDispatchResult<
  Source extends EventSource = EventSource,
  E extends string = string,
> = {
  source: Source;
  eventName: E;
  matched: number;
  executions: EventDispatchExecution[];
};

/** Bound dispatcher for one typed event source. */
export type EventDispatcher<Source extends EventSource> = <
  E extends EventSourceEvent<Source>,
>(
  event: E,
  ...args: EventSourceArgs<Source, E>
) => Promise<EventDispatchResult<Source, E>>;

/** Koa-style interceptor around an event handler's `run()` call. */
export type EventExecutionHandler = (
  execution: AnyEventExecutionContext,
  next: ExecutionNext<EventExecutionOutcome>,
  manager: EventManager,
) => MaybePromise<EventExecutionOutcome>;

/**
 * Callback invoked after every event handler runs, receiving the normalized
 * {@link EventResultHandlerInfos} to log or react to the outcome.
 *
 * Receives the owning {@link EventManager} as a second argument so a custom
 * handler can run its own logic and then delegate to the framework default via
 * `manager.defaultResultHandler(infos)`.
 *
 * @deprecated Use {@link EventExecutionHandler}.
 */
export type EventResultHandler = (
  infos: EventResultHandlerInfos,
  manager: EventManager,
) => void | Promise<void>;

/**
 * What an intent-coverage check does when it finds an issue: `off` (nothing), `warn`,
 * or `error` (return a loading failure).
 */
export type EventIntentCheckAction = "off" | "warn" | "error";

/** Per-{@link EventIntentCoverageTarget} toggle of the coverage expected by the intent check. */
export type EventIntentCheckCoverage = Partial<Record<EventIntentCoverageTarget, boolean>>;

/**
 * Controls diagnostics for event handlers whose gateway intents are not covered
 * by the client options.
 */
export type EventIntentCheckOptions = {
  /**
   * Action used when no configured intent can receive the event.
   *
   * @default "warn"
   */
  missing?: EventIntentCheckAction;

  /**
   * Action used when an event is partially covered. This only applies to events
   * that can be received through one of multiple intents, such as guild or DM
   * message events.
   *
   * @default "off"
   */
  partialCoverage?: EventIntentCheckAction;

  /**
   * Expected coverage for events that can be received through guild and/or DM
   * intents.
   *
   * `partialCoverage` only reports missing alternatives enabled here.
   *
   * @default { guild: true, dm: true }
   */
  coverage?: EventIntentCheckCoverage;

  /**
   * Event names excluded from intent diagnostics.
   *
   * @default []
   */
  ignore?: (keyof ClientEvents)[];
};

export type RequiredEventIntentCheckOptions = Required<EventIntentCheckOptions>;

/** The kind of issue reported by an intent check: fully `missing` or only `partialCoverage`. */
export type EventIntentCheckIssueType = "missing" | "partialCoverage";

/**
 * A single diagnostic produced by the event intent check, describing the affected
 * handler and the missing/present intents.
 */
export type EventIntentCheckIssue = {
  /**
   * The type of diagnostic emitted by the check.
   */
  type: EventIntentCheckIssueType;

  /**
   * The event handler checked.
   */
  event: AnyEventHandler;

  /**
   * The intent requirement for the event.
   */
  requirement: EventIntentRequirement;

  /**
   * Intents configured on the client that satisfy part of the requirement.
   */
  present: string[];

  /**
   * Intents missing from the client options.
   */
  missing: string[];

  /**
   * Coverage targets missing from the client options, when applicable.
   */
  missingCoverage?: EventIntentCoverageTarget[];

  /**
   * Human-readable diagnostic message.
   */
  message: string;
};

type BaseEventManagerOptions = {
  /**
   * Checks loaded event handlers against the client gateway intents.
   * This never adds intents automatically; it only warns or throws.
   *
   * Set to `false` to disable all intent diagnostics.
   *
   * @default { missing: "warn", partialCoverage: "off", ignore: [] }
   */
  intentCheck?: false | EventIntentCheckOptions;
};

type EventExecutionHandlerOptions = {
  /**
   * Ordered Koa-style interceptors around event `run()`.
   *
   * Providing this option replaces Arcscord's default execution handler.
   */
  executionHandlers?: readonly EventExecutionHandler[];
  resultHandler?: never;
};

type LegacyEventResultHandlerOptions = {
  executionHandlers?: never;

  /**
   * Set a custom result handler.
   *
   * @deprecated Use {@link EventManagerOptions.executionHandlers}.
   */
  resultHandler?: EventResultHandler;
};

/**
 * Options for the event manager.
 *
 * `executionHandlers` and the deprecated `resultHandler` are mutually exclusive.
 */
export type EventManagerOptions = BaseEventManagerOptions
  & (EventExecutionHandlerOptions | LegacyEventResultHandlerOptions);
