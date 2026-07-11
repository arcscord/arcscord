import type { Result } from "@arcscord/error";

/** Successful handler execution. */
export type ExecutionSuccess<T> = {
  status: "success";
  value: T;
};

/** Expected failure explicitly returned by a handler. */
export type ExecutionFailure<E> = {
  status: "failure";
  failure: E;
};

/** Unexpected value thrown by a handler or middleware. */
export type ExecutionDefect = {
  status: "defect";
  defect: unknown;
};

/** Cancelled or interrupted handler execution. */
export type ExecutionInterrupted = {
  status: "interrupted";
  reason?: unknown;
};

/** Normalized outcome of a command, component, event, or middleware execution. */
export type ExecutionExit<T, E = unknown>
  = | ExecutionSuccess<T>
    | ExecutionFailure<E>
    | ExecutionDefect
    | ExecutionInterrupted;

/** Creates a successful execution exit. */
export function executionSuccess<T>(value: T): ExecutionSuccess<T> {
  return { status: "success", value };
}

/** Creates an expected-failure execution exit. */
export function executionFailure<E>(failure: E): ExecutionFailure<E> {
  return { status: "failure", failure };
}

/** Creates an unexpected-defect execution exit. */
export function executionDefect(defect: unknown): ExecutionDefect {
  return { status: "defect", defect };
}

/** Creates an interrupted execution exit. */
export function executionInterrupted(reason?: unknown): ExecutionInterrupted {
  return reason === undefined
    ? { status: "interrupted" }
    : { status: "interrupted", reason };
}

/** Normalizes raw handler values and Arcscord Result tuples to an {@link ExecutionExit}. */
export function normalizeHandlerReturn<T, E>(
  value: void | T | Result<T, E>,
): ExecutionExit<T | true, E> {
  if (value === undefined || value === null) {
    return executionSuccess(true);
  }
  if (isArcscordResult(value)) {
    const [failure, success] = value;
    return failure === null
      ? executionSuccess(success as T)
      : executionFailure(failure);
  }
  return executionSuccess(value as T);
}

/** Returns whether a value has the shape of an Arcscord Result tuple. */
export function isArcscordResult(value: unknown): value is Result<unknown, unknown> {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  const [failure, success] = value as [unknown, unknown];
  return (failure === null) !== (success === null);
}
