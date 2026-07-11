import type { ArcscordErrorCode, ArcscordErrorMetadata } from "./codes";

/** Construction options for a code-specific {@link ArcscordError}. */
export type ArcscordErrorOptions<Code extends ArcscordErrorCode> = {
  code: Code;
  message: string;
  metadata: ArcscordErrorMetadata[Code];
  cause?: unknown;
};

/**
 * An error produced by the Arcscord framework.
 *
 * The stable {@link code} identifies the failure category while
 * {@link metadata} carries code-specific, structured details. Execution
 * context and incident identifiers intentionally live in result-handler
 * payloads rather than on the error itself.
 */
export class ArcscordError<Code extends ArcscordErrorCode = ArcscordErrorCode> extends Error {
  readonly code: Code;
  readonly metadata: ArcscordErrorMetadata[Code];

  constructor(options: ArcscordErrorOptions<Code>) {
    super(options.message, { cause: options.cause });
    this.name = "ArcscordError";
    this.code = options.code;
    this.metadata = options.metadata;
  }
}

/** Returns whether a value is an {@link ArcscordError}. */
export function isArcscordError(value: unknown): value is ArcscordError {
  return value instanceof ArcscordError;
}
