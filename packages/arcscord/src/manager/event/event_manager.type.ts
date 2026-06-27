import type { ClientEvents } from "discord.js";
import type { AnyEventHandler, EventHandleResult } from "#/base/event";
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

/**
 * Payload delivered to `resultHandler` when `run()` returned normally
 * (with a `Result`, a raw value, or `void`).
 */
export type EventReturnedHandlerInfos = BaseEventResultHandlerInfos & {
  status: "returned";
  /**
   * The normalized result of `run()`. May be `ok` or `error` — the author
   * explicitly returned an error `Result`.
   */
  result: EventHandleResult;
};

/**
 * Payload delivered to `resultHandler` when `run()` threw an unhandled exception.
 *
 * There is no `result` field here — the thrown value has not been normalized.
 * Use `thrownValue` directly and construct whatever error type you need.
 * The default handler wraps it in an `EventError`.
 */
export type EventThrownHandlerInfos = BaseEventResultHandlerInfos & {
  status: "thrown";
  /**
   * The raw value that was thrown by `run()`.
   * May be any type — an `EventError`, a plain `Error`, a string, etc.
   */
  thrownValue: unknown;
};

/**
 * Payload received by `resultHandler` after every event `run()` execution.
 *
 * Use the `status` discriminant to branch between the two cases:
 * ```ts
 * resultHandler: ({ status, result, event }) => {
 *   if (status === "thrown") {
 *     // infos.thrownValue is the raw thrown value (not wrapped)
 *     return;
 *   }
 *   const [err] = result;
 * }
 * ```
 */
export type EventResultHandlerInfos
  = | EventReturnedHandlerInfos
    | EventThrownHandlerInfos;

export type EventResultHandler = (
  infos: EventResultHandlerInfos,
) => void | Promise<void>;

export type EventIntentCheckAction = "off" | "warn" | "throw";

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

export type EventIntentCheckIssueType = "missing" | "partialCoverage";

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
