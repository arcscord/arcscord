import type { ComponentContext, ComponentRunResult } from "#/base";
import type { ComponentError } from "#/utils/error/class/component_error";
import type { MaybePromise } from "#/utils/type/util.type";

/**
 * Represents the next middleware to be processed.
 * @template T - The object that the middleware return
 */
export type NextComponentMiddleware<T extends NonNullable<unknown>> = {
  cancel: null;
  error: null;
  next: T;
};

/**
 * Represents a component middleware that cancels the component.
 */
export type CancelComponentMiddleware = {
  cancel: MaybePromise<ComponentRunResult>;
  error: null;
  next: null;
};

/**
 * Represents a component middleware that fails the component.
 */
export type ErrorComponentMiddleware = {
  cancel: null;
  error: MaybePromise<ComponentError>;
  next: null;
};

/**
 * Union type representing the result of a component middleware run.
 * @template T - The object that the middleware return
 */
export type ComponentMiddlewareRun<T extends NonNullable<unknown>>
  = | NextComponentMiddleware<T>
    | CancelComponentMiddleware
    | ErrorComponentMiddleware;

/**
 * Abstract class representing a component middleware.
 */
export abstract class ComponentMiddleware {
  /**
   * The name of the middleware.
   *
   * @remarks add a const after the name, like `name = "example" as const`
   */
  abstract readonly name: string;

  /**
   * Run the middleware.
   * @param ctx - The component context.
   * @returns The result of the middleware run.
   */
  abstract run(
    ctx: ComponentContext
  ): MaybePromise<ComponentMiddlewareRun<NonNullable<unknown>>>;

  /**
   * Create the next middleware run result.
   * @template T - The type of the next value.
   * @param value - The next value to be processed.
   * @returns The next middleware run result.
   */
  next<T extends NonNullable<unknown>>(value: T): ComponentMiddlewareRun<T> {
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
    value: MaybePromise<ComponentRunResult>,
  ): ComponentMiddlewareRun<T> {
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
    value: MaybePromise<ComponentError>,
  ): ComponentMiddlewareRun<T> {
    return {
      cancel: null,
      error: value,
      next: null,
    };
  }
}
