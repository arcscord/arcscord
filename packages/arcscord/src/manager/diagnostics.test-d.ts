import type {
  CommandExecuteDiagnosticMessage,
  DiagnosticChannel,
  EventIntentDiagnosticMessage,
} from "#/index";
import { expectTypeOf } from "vitest";
import {
  managerDiagnosticChannels,
} from "#/index";

expectTypeOf(managerDiagnosticChannels.command.execute)
  .toEqualTypeOf<DiagnosticChannel<CommandExecuteDiagnosticMessage>>();
expectTypeOf(managerDiagnosticChannels.event.intent)
  .toEqualTypeOf<DiagnosticChannel<EventIntentDiagnosticMessage>>();

managerDiagnosticChannels.command.execute.subscribe((message) => {
  expectTypeOf(message.operationId).toEqualTypeOf<symbol>();
  if (message.phase === "end") {
    expectTypeOf(message.outcome).not.toBeUnknown();
    expectTypeOf(message.durationMs).toBeNumber();
  }
});
