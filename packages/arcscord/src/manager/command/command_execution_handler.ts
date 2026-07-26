import type {
  BaseCommandExecutionInfos,
  CommandExecutionContext,
  CommandExecutionHandler,
  CommandExecutionOutcome,
  CommandResultHandler,
  CommandResultHandlerInfos,
} from "./command_manager.type";
import { anyToError } from "@arcscord/error";
import { MessageFlags } from "discord.js";
import { commandInteractionToString } from "#/base/command";

type CompletedCommandExecutionOutcome = Extract<
  CommandExecutionOutcome,
  { kind: "completed" }
>;

async function sendFailureReply(
  execution: BaseCommandExecutionInfos,
  incidentId: string,
  manager: Parameters<CommandExecutionHandler>[2],
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
export async function runDefaultCommandExecution(
  execution: BaseCommandExecutionInfos,
  outcome: CompletedCommandExecutionOutcome,
  manager: Parameters<CommandExecutionHandler>[2],
): Promise<void> {
  const meta = {
    command: execution.interaction.commandName,
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
  manager.logger.debug(`Command executed: ${commandInteractionToString(execution.interaction)}`, {
    ...meta,
    value: outcome.exit.value,
  });
}

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
  = async (execution, next, manager) => {
    const outcome = await next();
    if (outcome.kind === "completed") {
      await runDefaultCommandExecution(execution, outcome, manager);
    }
    return outcome;
  };
