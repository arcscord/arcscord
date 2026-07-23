import type { ArcscordErrorMetadata } from "../codes";
import { anyToError } from "@arcscord/error";
import { ArcscordError } from "../arcscord_error";
import { arcscordErrorCodes } from "../codes";

/** The interaction operation that failed. */
export type InteractionOperation
  = ArcscordErrorMetadata["INTERACTION_OPERATION_FAILED"]["operation"];

/** Human-readable message prefix for each interaction operation. */
const operationMessages: Record<InteractionOperation, string> = {
  reply: "failed to reply to interaction",
  editReply: "failed to edit reply to interaction",
  deferReply: "failed to defer reply to interaction",
  showModal: "failed to show modal",
  deferUpdate: "failed to defer update message",
  updateMessage: "failed to update message",
  autocomplete: "failed to send choices for command",
};

/**
 * Error produced when a Discord interaction operation (reply, defer, update, …)
 * throws. Centralizes the {@link arcscordErrorCodes.InteractionOperationFailed}
 * code, the `operation` metadata, and the message formatting shared by every
 * interaction context.
 */
export class InteractionOperationError extends ArcscordError<"INTERACTION_OPERATION_FAILED"> {
  constructor(operation: InteractionOperation, cause: unknown) {
    super({
      code: arcscordErrorCodes.InteractionOperationFailed,
      message: `${operationMessages[operation]} : ${anyToError(cause).message}`,
      metadata: { operation },
      cause,
    });
  }
}
