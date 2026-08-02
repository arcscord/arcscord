import type { EventSource } from "#/base/event/event_source";
import type { EventManager } from "./event_manager.class";
import type {
  AnyEventExecutionContext,
  EventExecutionHandler,
  EventExecutionOutcome,
  EventResultHandler,
  EventResultHandlerInfos,
  SourceEventExecutionHandler,
} from "./event_manager.type";

type CompletedEventExecutionOutcome = Extract<
  EventExecutionOutcome,
  { kind: "completed" }
>;

type DefaultEventExecutionInfos = {
  event: { name: string };
  eventName: string;
  source?: EventSource;
};

/** @internal */
export function runDefaultEventExecution(
  execution: DefaultEventExecutionInfos,
  outcome: CompletedEventExecutionOutcome,
  manager: EventManager,
): void {
  const meta = {
    handler: execution.event.name,
    event: execution.eventName,
    source: execution.source?.name ?? "discord-gateway",
    durationMs: outcome.durationMs,
    incidentId: outcome.incidentId,
  };

  if (outcome.exit.status === "defect") {
    const incidentId = outcome.incidentId ?? crypto.randomUUID();
    manager.logger.logError(outcome.exit.defect, { ...meta, incidentId });
    return;
  }
  if (outcome.exit.status === "failure") {
    manager.logger.logError(outcome.exit.failure, meta);
  }
}

function toResultHandlerInfos(
  execution: AnyEventExecutionContext,
  outcome: Extract<EventExecutionOutcome, { kind: "completed" }>,
): EventResultHandlerInfos {
  return {
    event: execution.event,
    eventName: execution.eventName,
    source: execution.source,
    exit: outcome.exit,
    startedAt: outcome.startedAt,
    endedAt: outcome.endedAt,
    durationMs: outcome.durationMs,
    incidentId: outcome.incidentId,
  };
}

/** @internal */
export function eventResultHandlerAdapter(
  resultHandler: EventResultHandler,
): EventExecutionHandler {
  return async (execution, next, manager) => {
    const outcome = await next();
    if (outcome.kind === "completed") {
      try {
        await resultHandler(toResultHandlerInfos(execution, outcome), manager);
      }
      catch (error) {
        manager.logger.logError(error, { source: "resultHandler" });
      }
    }
    return outcome;
  };
}

/**
 * Arcscord's default event execution interceptor.
 *
 * Add it explicitly to a custom `executionHandlers` array to reuse the default
 * failure and defect logging.
 */
export const defaultEventExecutionHandler: EventExecutionHandler
  = async (execution, next, manager) => {
    const outcome = await next();
    if (outcome.kind === "completed") {
      runDefaultEventExecution(execution, outcome, manager);
    }
    return outcome;
  };

/** Default failure and defect logger for custom-source event executions. */
export const defaultSourceEventExecutionHandler: SourceEventExecutionHandler
  = async (execution, next, manager) => {
    const outcome = await next();
    if (outcome.kind === "completed") {
      runDefaultEventExecution(execution, outcome, manager);
    }
    return outcome;
  };
