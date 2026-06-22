import type { BaseError } from "@arcscord/better-error";
import type { Result } from "@arcscord/error";
import type { ClientEvents } from "discord.js";
import type { AnyEventHandler } from "#/base/event";
import type { EventError } from "#/utils";
import type { EventIntentCoverageTarget, EventIntentRequirement } from "./intents_map";

export type EventResultHandlerInfos = {
  /**
   * The result of the event execution.
   */
  result: Result<string | true, BaseError | EventError>;

  /**
   * The event handler object
   */
  event: AnyEventHandler;

  /**
   * the event name
   */
  eventName: keyof ClientEvents | string;
};

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
   * @default {@link EventManager.resultHandler}
   */
  resultHandler?: EventResultHandler;
};
