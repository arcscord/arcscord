import type { ExecutionExit } from "#/utils/error/execution_exit";
import type { MaybePromise } from "#/utils/type/util.type";

/** Timing metadata shared by every execution outcome. */
export type ExecutionTiming = {
  /** Unix timestamp (ms) when the execution pipeline started. */
  startedAt: number;
  /** Unix timestamp (ms) when the outcome was created. */
  endedAt: number;
  /** Total execution duration in milliseconds. */
  durationMs: number;
};

/** Outcome produced when the middleware and handler pipeline completed. */
export type CompletedExecutionOutcome<T, E = unknown> = ExecutionTiming & {
  kind: "completed";
  exit: ExecutionExit<T, E>;
  /** Correlation ID generated for an unexpected defect. */
  incidentId?: string;
};

/** Outcome produced when middleware deliberately stops before `run()`. */
export type CancelledExecutionOutcome = ExecutionTiming & {
  kind: "cancelled";
};

/** Normalized result returned by an execution interceptor chain. */
export type ExecutionOutcome<T, E = unknown>
  = | CompletedExecutionOutcome<T, E>
    | CancelledExecutionOutcome;

/** Runs the next interceptor, or the underlying middleware and handler terminal. */
export type ExecutionNext<O> = () => Promise<O>;

/**
 * Koa-style interceptor that can run before and after `next()`, short-circuit
 * execution, or return a transformed outcome.
 */
export type ExecutionHandler<C, O, M> = (
  execution: C,
  next: ExecutionNext<O>,
  manager: M,
) => MaybePromise<O>;

/** Controls available on every manager-specific execution context. */
export type ExecutionControls<T, E = unknown> = {
  /** Unix timestamp (ms) when the interceptor chain started. */
  startedAt: number;
  /** Completes or short-circuits the chain with a normalized exit. */
  complete: (exit: ExecutionExit<T, E>) => CompletedExecutionOutcome<T, E>;
  /** Cancels or short-circuits the chain without a handler result. */
  cancel: () => CancelledExecutionOutcome;
};

/** Creates timing-aware controls for a manager-specific execution context. */
export function createExecutionControls<T, E = unknown>(
  startedAt: number,
): ExecutionControls<T, E> {
  const timing = (): ExecutionTiming => {
    const endedAt = Date.now();
    return {
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
    };
  };

  return {
    startedAt,
    complete: exit => ({
      kind: "completed",
      exit,
      ...timing(),
      incidentId: exit.status === "defect" ? crypto.randomUUID() : undefined,
    }),
    cancel: () => ({
      kind: "cancelled",
      ...timing(),
    }),
  };
}

/**
 * Composes execution handlers and guarantees that each `next()` function can
 * only be invoked once.
 */
export async function composeExecutionHandlers<C, O, M>(
  handlers: readonly ExecutionHandler<C, O, M>[],
  execution: C,
  terminal: ExecutionNext<O>,
  manager: M,
): Promise<O> {
  let lastIndex = -1;

  const dispatch = async (index: number): Promise<O> => {
    if (index <= lastIndex) {
      throw new Error("execution handler next() called more than once");
    }
    lastIndex = index;

    const handler = handlers[index];
    if (!handler) {
      return terminal();
    }

    return handler(execution, () => dispatch(index + 1), manager);
  };

  return dispatch(0);
}
