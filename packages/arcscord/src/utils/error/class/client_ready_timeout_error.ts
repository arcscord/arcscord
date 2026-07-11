import { ArcscordError } from "../arcscord_error";
import { arcscordErrorCodes } from "../codes";

/**
 * Error thrown when an ArcClient does not become ready before the configured timeout.
 */
export class ArcClientReadyTimeoutError extends ArcscordError<"CLIENT_READY_TIMEOUT"> {
  name = "ArcClientReadyTimeoutError";

  /**
   * Configured timeout in milliseconds.
   */
  readonly timeout: number;

  constructor(timeout: number) {
    super({
      code: arcscordErrorCodes.ClientReadyTimeout,
      message: `ArcClient did not become ready within ${timeout}ms`,
      metadata: { timeoutMs: timeout },
    });
    this.name = "ArcClientReadyTimeoutError";
    this.timeout = timeout;
  }
}
