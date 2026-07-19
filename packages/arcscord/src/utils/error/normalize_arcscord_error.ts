import type { MessageComponentValidationError } from "@arcscord/components";
import { isMessageComponentValidationError } from "@arcscord/components";
import { ArcscordError } from "./arcscord_error";
import { arcscordErrorCodes } from "./codes";

/** Arcscord representation of a Components V2 validation failure. */
export type MessageComponentArcscordError = ArcscordError<"MESSAGE_COMPONENT_VALIDATION_FAILED">;

/**
 * Converts errors recognized by Arcscord into their framework representation.
 * Unknown errors are returned unchanged so their identity and stack are preserved.
 */
export function normalizeArcscordError(cause: MessageComponentValidationError): MessageComponentArcscordError;
/** Returns an unrecognized cause unchanged. */
export function normalizeArcscordError<Cause>(cause: Cause): Cause | MessageComponentArcscordError;
export function normalizeArcscordError<Cause>(cause: Cause): Cause | MessageComponentArcscordError {
  if (!isMessageComponentValidationError(cause)) {
    return cause;
  }

  return new ArcscordError({
    code: arcscordErrorCodes.MessageComponentValidationFailed,
    message: cause.message,
    metadata: {
      rule: cause.rule,
      path: cause.path,
      details: cause.details,
      ...(cause.componentType === undefined ? {} : { componentType: cause.componentType }),
    },
    cause,
  });
}
