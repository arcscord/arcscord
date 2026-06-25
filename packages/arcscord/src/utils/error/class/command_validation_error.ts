import { InternalError } from "./internal_error";

export class CommandValidationError extends InternalError {
  name = "CommandValidationError";
}
