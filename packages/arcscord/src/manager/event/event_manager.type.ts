import type { ClientEvents } from "discord.js";
import type { AnyEventHandler } from "#/base/event";
import type { ExecutionExit } from "#/utils/error/execution_exit";
import type { EventIntentCoverageTarget, EventIntentRequirement } from "./intents_map";

/**
 * Shared fields present in all event result handler payloads.
 */
type BaseEventResultHandlerInfos = {
  /**
   * The event handler that was executed.
   */
  event: AnyEventHandler;

  /**
   * The Discord.js event name.
   */
  eventName: keyof ClientEvents | string;
};

/** Payload received by `resultHandler` after every event execution. */
export type EventResultHandlerInfos = BaseEventResultHandlerInfos & {
  exit: ExecutionExit<string | true, unknown>;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  incidentId?: string;
};

/**
 * Callback invoked after every event handler runs, receiving the normalized
 * {@link EventResultHandlerInfos} to log or react to the outcome.
 */
export type EventResultHandler = (
  infos: EventResultHandlerInfos,
) => void | Promise<void>;

/** What an intent-coverage check does when it finds an issue: `off` (nothing), `warn`, or `error` (return a loading failure). */
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

/** A single diagnostic produced by the event intent check, describing the affected handler and the missing/present intents. */
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

/** Options for the {@link EventManager}, including the gateway-intent coverage check and the result handler. */
export type EventManagerOptions = {
  /**
   * Checks loaded event handlers against the client gateway intents.
   * This never adds intents automatically; it only warns or throws.
   *
   * Set to `false` to disable all intent diagnostics.
   *
   * @default { missing: "warn", partialCoverage: "off", ignore: [] }
   */
  intentCheck?: false | EventIntentCheckOptions;

  /**
   * Set a custom result handler
   * @default {@link EventManager.handleResult}
   */
  resultHandler?: EventResultHandler;
};
