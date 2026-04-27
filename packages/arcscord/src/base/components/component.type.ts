import type { Result } from "@arcscord/error";
import type { ComponentError } from "#/utils";

/**
 * Represents the result of running a component.
 */
export type ComponentRunResult = Result<true | string, ComponentError>;
