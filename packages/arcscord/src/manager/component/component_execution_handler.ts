import type {
  BaseComponentExecutionInfos,
  ComponentExecutionContext,
  ComponentExecutionHandler,
  ComponentExecutionOutcome,
  ComponentResultHandler,
  ComponentResultHandlerInfos,
} from "./component_manager.type";
import { anyToError } from "@arcscord/error";
import { MessageFlags } from "discord.js";

type CompletedComponentExecutionOutcome = Extract<
  ComponentExecutionOutcome,
  { kind: "completed" }
>;

async function sendFailureReply(
  execution: BaseComponentExecutionInfos,
  incidentId: string,
  manager: Parameters<ComponentExecutionHandler>[2],
): Promise<void> {
  const message = manager.client.getErrorMessage(incidentId, execution.locale);
  try {
    if (execution.context.defer) {
      await execution.interaction.editReply(message);
    }
    else {
      await execution.interaction.reply({ ...message, flags: MessageFlags.Ephemeral });
    }
  }
  catch (error) {
    manager.logger.error("failed to send failure reply", {
      baseError: anyToError(error).message,
    });
  }
}

/** @internal */
export async function runDefaultComponentExecution(
  execution: BaseComponentExecutionInfos,
  outcome: CompletedComponentExecutionOutcome,
  manager: Parameters<ComponentExecutionHandler>[2],
): Promise<void> {
  const meta = {
    route: execution.component.route,
    interactionId: execution.interaction.id,
    guildId: execution.interaction.guildId,
    userId: execution.interaction.user.id,
    durationMs: outcome.durationMs,
    incidentId: outcome.incidentId,
  };

  if (outcome.exit.status === "defect") {
    const incidentId = outcome.incidentId ?? crypto.randomUUID();
    manager.logger.logError(outcome.exit.defect, { ...meta, incidentId });
    return sendFailureReply(execution, incidentId, manager);
  }
  if (outcome.exit.status === "failure") {
    const incidentId = crypto.randomUUID();
    manager.logger.logError(outcome.exit.failure, { ...meta, incidentId });
    return sendFailureReply(execution, incidentId, manager);
  }
  manager.logger.debug(`Component executed: ${execution.component.route}`, {
    ...meta,
    value: outcome.exit.value,
  });
}

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
  = async (execution, next, manager) => {
    const outcome = await next();
    if (outcome.kind === "completed") {
      await runDefaultComponentExecution(execution, outcome, manager);
    }
    return outcome;
  };
