import type {
  AnyEventExecutionContext,
  BaseEventExecutionInfos,
  EventExecutionHandler,
  EventExecutionOutcome,
  EventResultHandler,
  EventResultHandlerInfos,
} from "./event_manager.type";

type CompletedEventExecutionOutcome = Extract<
  EventExecutionOutcome,
  { kind: "completed" }
>;

/** @internal */
export function runDefaultEventExecution(
  execution: BaseEventExecutionInfos,
  outcome: CompletedEventExecutionOutcome,
  manager: Parameters<EventExecutionHandler>[2],
): void {
  const meta = {
    handler: execution.event.name,
    event: execution.eventName,
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
