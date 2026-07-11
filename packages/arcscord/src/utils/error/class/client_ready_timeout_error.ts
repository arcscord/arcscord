import { BaseError } from "@arcscord/better-error";

/**
 * Error thrown when an ArcClient does not become ready before the configured timeout.
 */
export class ArcClientReadyTimeoutError extends BaseError {
  name = "ArcClientReadyTimeoutError";

  /**
   * Configured timeout in milliseconds.
   */
  readonly timeout: number;

  constructor(timeout: number) {
    super({
      message: `ArcClient did not become ready within ${timeout}ms`,
      debugs: { timeout },
    });
    this.timeout = timeout;
  }
}
