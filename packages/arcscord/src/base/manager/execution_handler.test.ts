import type { ExecutionHandler } from "./execution_handler";
import { describe, expect, it } from "vitest";
import { composeExecutionHandlers } from "./execution_handler";

describe("composeExecutionHandlers", () => {
  it("runs handlers before next in declaration order and unwinds in reverse", async () => {
    const calls: string[] = [];
    const handlers: ExecutionHandler<object, string, object>[] = [
      async (_execution, next) => {
        calls.push("first:before");
        const outcome = await next();
        calls.push("first:after");
        return `${outcome}:first`;
      },
      async (_execution, next) => {
        calls.push("second:before");
        const outcome = await next();
        calls.push("second:after");
        return `${outcome}:second`;
      },
    ];

    const outcome = await composeExecutionHandlers(
      handlers,
      {},
      async () => {
        calls.push("terminal");
        return "run";
      },
      {},
    );

    expect(outcome).toBe("run:second:first");
    expect(calls).toEqual([
      "first:before",
      "second:before",
      "terminal",
      "second:after",
      "first:after",
    ]);
  });

  it("supports short-circuiting without running the terminal", async () => {
    const handlers: ExecutionHandler<object, string, object>[] = [
      () => "short-circuit",
    ];
    let terminalCalled = false;

    const outcome = await composeExecutionHandlers(
      handlers,
      {},
      async () => {
        terminalCalled = true;
        return "terminal";
      },
      {},
    );

    expect(outcome).toBe("short-circuit");
    expect(terminalCalled).toBe(false);
  });

  it("rejects a second call to the same next function", async () => {
    const handlers: ExecutionHandler<object, string, object>[] = [
      async (_execution, next) => {
        await next();
        return next();
      },
    ];

    await expect(composeExecutionHandlers(
      handlers,
      {},
      async () => "terminal",
      {},
    )).rejects.toThrow("execution handler next() called more than once");
  });
});
