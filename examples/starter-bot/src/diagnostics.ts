/**
 * Minimal observability hooks for the starter bot.
 *
 * Arcscord keeps the channels dormant until these listeners are installed.
 * Keep listeners synchronous and small; forward data to a queue or telemetry
 * SDK instead of doing slow work here in a production bot.
 */
import type { DiagnosticOperationId } from "arcscord";
import { managerDiagnosticChannels } from "arcscord";

/** Installs the starter bot's diagnostics-channel listeners. */
export function installDiagnostics(): void {
  const activeCommands = new Set<DiagnosticOperationId>();

  managerDiagnosticChannels.command.execute.subscribe((message) => {
    if (message.phase === "start") {
      activeCommands.add(message.operationId);
      return;
    }
    if (!activeCommands.delete(message.operationId) || message.phase !== "end") {
      return;
    }

    message.manager.logger.debug("command execution", {
      command: message.execution.interaction.commandName,
      status: message.outcome.kind === "completed"
        ? message.outcome.exit.status
        : "cancelled",
      durationMs: message.durationMs,
    });
  });

  managerDiagnosticChannels.component.execute.subscribe((message) => {
    if (message.phase !== "end") {
      return;
    }

    message.manager.logger.debug("component execution", {
      route: message.execution.component.route,
      status: message.outcome.kind === "completed"
        ? message.outcome.exit.status
        : "cancelled",
      durationMs: message.durationMs,
    });
  });

  managerDiagnosticChannels.event.intent.subscribe((message) => {
    message.manager.logger.warn("event intent diagnostic", {
      handler: message.issue.event.name,
      event: message.issue.event.event,
      action: message.action,
      missing: message.issue.missing,
    });
  });
}
