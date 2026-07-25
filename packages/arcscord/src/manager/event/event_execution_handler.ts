import type {
  AnyEventExecutionContext,
  EventExecutionHandler,
  EventExecutionOutcome,
  EventResultHandler,
  EventResultHandlerInfos,
} from "./event_manager.type";

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
  = eventResultHandlerAdapter((infos, manager) => manager.defaultResultHandler(infos));
