import { InternalError } from "./internal_error";

/**
 * Error raised when a command definition fails validation (invalid name, option
 * bounds, localization, etc.) before it is registered with Discord.
 *
 * It signals a developer/configuration mistake rather than a runtime interaction
 * failure.
 */
export class CommandValidationError extends InternalError {
  name = "CommandValidationError";
}
