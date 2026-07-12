import type { NonNullish, Result } from "@arcscord/error";
import { isResult } from "@arcscord/error";

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

/** Normalized outcome of a command, component, event, or middleware execution. */
export type ExecutionExit<T, E = unknown>
  = | ExecutionSuccess<T>
    | ExecutionFailure<E>
    | ExecutionDefect;

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

/** Normalizes raw handler values and Arcscord Result tuples to an {@link ExecutionExit}. */
export function normalizeHandlerReturn<T, E extends NonNullish>(
  value: void | T | Result<T, E>,
): ExecutionExit<T | true, E> {
  if (value === undefined || value === null) {
    return executionSuccess(true);
  }
  if (isResult(value)) {
    const [failure, success] = value;
    return failure === null
      ? executionSuccess(success as T)
      : executionFailure(failure as E);
  }
  return executionSuccess(value as T);
}

/**
 * Returns whether a value has the shape of an Arcscord Result tuple.
 *
 * @deprecated Use `isResult` from `@arcscord/error` instead.
 */
export const isArcscordResult = isResult;
