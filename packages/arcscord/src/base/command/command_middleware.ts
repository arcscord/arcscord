import type { CommandContext, CommandRunResult } from "#/base";
import type { MaybePromise } from "#/utils/type/util.type";

/** Middleware result that continues the chain with a value. */
export type NextCommandMiddleware<T extends NonNullable<unknown>> = {
  status: "next";
  value: T;
};

/** Middleware result that stops the chain normally. */
export type CancelCommandMiddleware = {
  status: "cancel";
  result?: MaybePromise<CommandRunResult>;
};

/** Middleware result that stops the chain with an expected failure. */
export type FailedCommandMiddleware<E = unknown> = {
  status: "failure";
  failure: MaybePromise<E>;
};

/** Discriminated result returned by command middleware. */
export type CommandMiddlewareRun<T extends NonNullable<unknown>, E = unknown>
  = | NextCommandMiddleware<T>
    | CancelCommandMiddleware
    | FailedCommandMiddleware<E>;

/** Base class for command middleware. */
export abstract class CommandMiddleware {
  /** Stable key used to expose the middleware's `next` value on `ctx.additional`. */
  abstract readonly name: string;

  /** Executes the middleware for a command context. */
  abstract run(
    ctx: CommandContext
  ): MaybePromise<CommandMiddlewareRun<NonNullable<unknown>>>;

  /** Continues the middleware chain and stores `value` on the command context. */
  next<T extends NonNullable<unknown>>(value: T): NextCommandMiddleware<T> {
    return { status: "next", value };
  }

  /** Stops the chain normally, optionally after awaiting a result-producing operation. */
  cancel(result?: MaybePromise<CommandRunResult>): CancelCommandMiddleware {
    return result === undefined
      ? { status: "cancel" }
      : { status: "cancel", result };
  }

  /** Stops the chain with an expected failure value. */
  fail<E>(failure: MaybePromise<E>): FailedCommandMiddleware<E> {
    return { status: "failure", failure };
  }
}
