import type { ComponentContext, ComponentRunResult } from "#/base";
import type { MaybePromise } from "#/utils/type/util.type";

/** Middleware result that continues the chain with a value. */
export type NextComponentMiddleware<T extends NonNullable<unknown>> = {
  status: "next";
  value: T;
};

/** Middleware result that stops the chain normally. */
export type CancelComponentMiddleware = {
  status: "cancel";
  result?: MaybePromise<ComponentRunResult>;
};

/** Middleware result that stops the chain with an expected failure. */
export type FailedComponentMiddleware<E = unknown> = {
  status: "failure";
  failure: MaybePromise<E>;
};

/** Discriminated result returned by component middleware. */
export type ComponentMiddlewareRun<T extends NonNullable<unknown>, E = unknown>
  = | NextComponentMiddleware<T>
    | CancelComponentMiddleware
    | FailedComponentMiddleware<E>;

/** Base class for component middleware. */
export abstract class ComponentMiddleware {
  /** Stable key used to expose the middleware's `next` value on `ctx.additional`. */
  abstract readonly name: string;

  /** Executes the middleware for a component context. */
  abstract run(
    ctx: ComponentContext
  ): MaybePromise<ComponentMiddlewareRun<NonNullable<unknown>>>;

  /** Continues the middleware chain and stores `value` on the component context. */
  next<T extends NonNullable<unknown>>(value: T): NextComponentMiddleware<T> {
    return { status: "next", value };
  }

  /** Stops the chain normally, optionally after awaiting a result-producing operation. */
  cancel(result?: MaybePromise<ComponentRunResult>): CancelComponentMiddleware {
    return result === undefined
      ? { status: "cancel" }
      : { status: "cancel", result };
  }

  /** Stops the chain with an expected failure value. */
  fail<E>(failure: MaybePromise<E>): FailedComponentMiddleware<E> {
    return { status: "failure", failure };
  }
}
