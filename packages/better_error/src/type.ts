import type { BaseError } from "./base_error";

/**
 * A collection of debug values.
 */
export type Debugs = Record<string, unknown>;

/**
 * A debug object with string values.
 */
export type DebugStringObject = Record<string, string>;

/**
 * Options for creating an error.
 */
export type ErrorOptions = {
  /**
   * The error message.
   */
  message: string;

  /**
   * Custom name for the error.
   * @defaultValue "baseError"
   */
  name?: string;

  /**
   * The original error associated with this error.
   */
  originalError?: BaseError | Error;

  /**
   * Debugging information for the error.
   */
  debugs?: Debugs;

  /**
   * Automatically generate a UUID v4 ID (ignored if customId is provided).
   * @defaultValue false
   */
  autoGenerateId?: boolean;

  /**
   * Custom ID for the error.
   */
  customId?: string;
};

/**
 * Options to customize the output of getDebugs.
 */
export type GetDebugOptions = {
  /**
   * Include the ID in the debug object.
   * @defaultValue true
   */
  id?: boolean;

  /**
   * Include debugs from original errors in the debug object.
   * @defaultValue true
   */
  originalErrorDebugs?: boolean | GetDebugOptions;

  /**
   * Include the stack trace in the debug.
   * @defaultValue true
   * @see {GetDebugOptions.stackFormat}
   */
  stack?: boolean;

  /**
   * Format of the stack output.
   *
   * - `default`: A single string.
   * - `split`: An array of strings, each representing a line of the stack trace.
   *
   * @defaultValue "split"
   */
  stackFormat?: StackFormat;

  /**
   * Include the stack trace of the original error (works with Error and BaseError).
   * @defaultValue true
   */
  originalErrorStack?: boolean;
};

/**
 * Format options for stack output.
 *
 * - `default`: A single string.
 * - `split`: An array of strings, each representing a line of the stack trace.
 */
export type StackFormat = "default" | "split";
