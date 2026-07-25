import type {
  CommandExecutionContext,
  CommandExecutionHandler,
  CommandExecutionOutcome,
  CommandResultHandler,
  CommandResultHandlerInfos,
} from "./command_manager.type";

/** Converts a completed command execution into the deprecated result payload. */
function toResultHandlerInfos(
  execution: CommandExecutionContext,
  outcome: Extract<CommandExecutionOutcome, { kind: "completed" }>,
): CommandResultHandlerInfos {
  return {
    interaction: execution.interaction,
    command: execution.command,
    context: execution.context,
    locale: execution.locale,
    defer: execution.context.defer,
    exit: outcome.exit,
    startedAt: outcome.startedAt,
    endedAt: outcome.endedAt,
    durationMs: outcome.durationMs,
    incidentId: outcome.incidentId,
  };
}

/** @internal */
export function commandResultHandlerAdapter(
  resultHandler: CommandResultHandler,
): CommandExecutionHandler {
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
 * Arcscord's default command execution interceptor.
 *
 * Add it explicitly to a custom `executionHandlers` array to reuse the default
 * logging and user-facing error replies.
 */
export const defaultCommandExecutionHandler: CommandExecutionHandler
  = commandResultHandlerAdapter((infos, manager) => manager.defaultResultHandler(infos));
