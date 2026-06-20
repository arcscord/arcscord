import type { CommandContext, CommandRunResult } from "#/base";
import type { CommandError } from "#/utils/error/class/command_error";
import type { MaybePromise } from "#/utils/type/util.type";

/**
 * Represents the next middleware to be processed.
 * @template T - The object that the middleware return
 */
export type NextCommandMiddleware<T extends NonNullable<unknown>> = {
  cancel: null;
  error: null;
  next: T;
};

/**
 * Represents a command middleware that cancels the command.
 */
export type CancelCommandMiddleware = {
  cancel: MaybePromise<CommandRunResult>;
  error: null;
  next: null;
};

/**
 * Represents a command middleware that fails the command.
 */
export type ErrorCommandMiddleware = {
  cancel: null;
  error: MaybePromise<CommandError>;
  next: null;
};

/**
 * Union type representing the result of a command middleware run.
 * @template T - The object that the middleware return
 */
export type CommandMiddlewareRun<T extends NonNullable<unknown>>
  = | NextCommandMiddleware<T>
    | CancelCommandMiddleware
    | ErrorCommandMiddleware;

/**
 * Abstract class representing a command middleware.
 */
export abstract class CommandMiddleware {
  /**
   * The name of the middleware.
   *
   * @remarks add a const after the name, like `name = "example" as const`
   */
  abstract readonly name: string;

  /**
   * Run the middleware.
   * @param ctx - The command context.
   * @returns The result of the middleware run.
   */
  abstract run(
    ctx: CommandContext
  ): MaybePromise<CommandMiddlewareRun<NonNullable<unknown>>>;

  /**
   * Create the next middleware run result.
   * @template T - The type of the next value.
   * @param value - The next value to be processed.
   * @returns The next middleware run result.
   */
  next<T extends NonNullable<unknown>>(value: T): CommandMiddlewareRun<T> {
    return {
      cancel: null,
      error: null,
      next: value,
    };
  }

  /**
   * Create the cancel middleware run result.
   * @template T - The type of the cancellation result.
   * @param value - The cancel value.
   * @returns The cancel middleware run result.
   */
  cancel<T extends NonNullable<unknown>>(
    value: MaybePromise<CommandRunResult>,
  ): CommandMiddlewareRun<T> {
    return {
      cancel: value,
      error: null,
      next: null,
    };
  }

  /**
   * Create the error middleware run result.
   * @template T - The type of the next value when the middleware does not fail.
   * @param value - The error value.
   * @returns The error middleware run result.
   */
  error<T extends NonNullable<unknown>>(
    value: MaybePromise<CommandError>,
  ): CommandMiddlewareRun<T> {
    return {
      cancel: null,
      error: value,
      next: null,
    };
  }
}
