import type {
  ComponentExecutionContext,
  ComponentExecutionHandler,
  ComponentExecutionOutcome,
  ComponentResultHandler,
  ComponentResultHandlerInfos,
} from "./component_manager.type";

function toResultHandlerInfos(
  execution: ComponentExecutionContext,
  outcome: Extract<ComponentExecutionOutcome, { kind: "completed" }>,
): ComponentResultHandlerInfos {
  return {
    component: execution.component,
    interaction: execution.interaction,
    context: execution.context,
    defer: execution.context.defer,
    locale: execution.locale,
    exit: outcome.exit,
    startedAt: outcome.startedAt,
    endedAt: outcome.endedAt,
    durationMs: outcome.durationMs,
    incidentId: outcome.incidentId,
  };
}

/** @internal */
export function componentResultHandlerAdapter(
  resultHandler: ComponentResultHandler,
): ComponentExecutionHandler {
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
 * Arcscord's default component execution interceptor.
 *
 * Add it explicitly to a custom `executionHandlers` array to reuse the default
 * logging and user-facing error replies.
 */
export const defaultComponentExecutionHandler: ComponentExecutionHandler
  = componentResultHandlerAdapter((infos, manager) => manager.defaultResultHandler(infos));
