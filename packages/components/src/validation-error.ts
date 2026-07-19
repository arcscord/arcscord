/** Structured, non-sensitive details attached to a component validation failure. */
export type MessageComponentValidationDetails = Readonly<Record<string, unknown>>;

/** Construction options for {@link MessageComponentValidationError}. */
export type MessageComponentValidationErrorOptions = {
  rule: string;
  path: string;
  message: string;
  componentType?: number;
  details?: MessageComponentValidationDetails;
  cause?: unknown;
};

/** An invalid Discord message-component payload detected before it is sent. */
export class MessageComponentValidationError extends Error {
  readonly rule: string;
  readonly path: string;
  readonly componentType: number | undefined;
  readonly details: MessageComponentValidationDetails;

  constructor(options: MessageComponentValidationErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "MessageComponentValidationError";
    this.rule = options.rule;
    this.path = options.path;
    this.componentType = options.componentType;
    this.details = options.details ?? {};
  }
}

/** Returns whether a value is a {@link MessageComponentValidationError}. */
export function isMessageComponentValidationError(value: unknown): value is MessageComponentValidationError {
  return value instanceof MessageComponentValidationError;
}
