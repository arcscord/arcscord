import { ArcscordError } from "../arcscord_error";
import { arcscordErrorCodes } from "../codes";

/** Error thrown when a localization adapter does not become ready in time. */
export class LocalizationReadyTimeoutError extends ArcscordError<"LOCALIZATION_READY_TIMEOUT"> {
  name = "LocalizationReadyTimeoutError";

  /** Configured timeout in milliseconds. */
  readonly timeout: number;

  constructor(timeout: number) {
    super({
      code: arcscordErrorCodes.LocalizationReadyTimeout,
      message: `Localization adapter did not become ready within ${timeout}ms`,
      metadata: { timeoutMs: timeout },
    });
    this.name = "LocalizationReadyTimeoutError";
    this.timeout = timeout;
  }
}
