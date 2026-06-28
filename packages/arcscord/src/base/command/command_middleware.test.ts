import type { CommandContext } from "./command_context";
import type { CommandMiddlewareRun } from "./command_middleware";
import { ok } from "@arcscord/error";
import { describe, expect, it, vi } from "vitest";
import { createMockCommandContext } from "#/testing";
import { CommandManager } from "../../manager/command/command_manager.class";
import { CommandError } from "../../utils/error/class/command_error";
import { CommandMiddleware } from "./command_middleware";

class TestCommandMiddleware extends CommandMiddleware {
  readonly name = "test" as const;

  run(_ctx: CommandContext): CommandMiddlewareRun<{ allowed: true }> {
    return this.next({ allowed: true });
  }
}

const context = createMockCommandContext({
  interaction: {
    kind: "unknown",
  },
});

const runMiddleware = (
  CommandManager.prototype as unknown as {
    runMiddleware: (command: unknown, context: CommandContext) => Promise<[CommandError | null, object | false | null]>;
  }
).runMiddleware;

describe("commandMiddleware", () => {
  it("creates a next result", () => {
    const middleware = new TestCommandMiddleware();
    const next = { allowed: true };

    expect(middleware.next(next)).toEqual({
      cancel: null,
      error: null,
      next,
    });
  });

  it("creates a cancel result", () => {
    const middleware = new TestCommandMiddleware();
    const cancel = Promise.resolve(ok(true as const));

    expect(middleware.cancel(cancel)).toEqual({
      cancel,
      error: null,
      next: null,
    });
  });

  it("creates an error result", () => {
    const middleware = new TestCommandMiddleware();
    const error = new CommandError({ message: "middleware failed", ctx: context });

    expect(middleware.error(error)).toEqual({
      cancel: null,
      error,
      next: null,
    });
  });

  it("collects next values while middleware continues", async () => {
    const middleware = new TestCommandMiddleware();

    const [err, additional] = await runMiddleware({ use: [middleware] } as any, context);

    expect(err).toBeNull();
    expect(additional).toEqual({ test: { allowed: true } });
  });

  it("returns an error when middleware names are duplicated", async () => {
    const first = new TestCommandMiddleware();
    const second = new TestCommandMiddleware();
    const firstRun = vi.spyOn(first, "run");
    const secondRun = vi.spyOn(second, "run");

    const [err, additional] = await runMiddleware({ use: [first, second] } as any, context);

    expect(err).toBeInstanceOf(CommandError);
    expect(err?.message).toBe("duplicate middleware name \"test\"");
    expect(additional).toBeNull();
    expect(firstRun).not.toHaveBeenCalled();
    expect(secondRun).not.toHaveBeenCalled();
  });

  it("stops when middleware cancels", async () => {
    const cancel = new class extends CommandMiddleware {
      readonly name = "cancel" as const;

      run(): CommandMiddlewareRun<NonNullable<unknown>> {
        return this.cancel(ok(true));
      }
    }();
    const next = vi.fn();

    const [err, additional] = await runMiddleware({
      use: [
        cancel,
        { name: "next", run: next },
      ],
    } as any, context);

    expect(err).toBeNull();
    expect(additional).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns an error when middleware fails", async () => {
    const middlewareError = new CommandError({ message: "middleware failed", ctx: context });
    const fail = new class extends CommandMiddleware {
      readonly name = "fail" as const;

      run(): CommandMiddlewareRun<NonNullable<unknown>> {
        return this.error(middlewareError);
      }
    }();
    const next = vi.fn();

    const [err, additional] = await runMiddleware({
      use: [
        fail,
        { name: "next", run: next },
      ],
    } as any, context);

    expect(err).toBe(middlewareError);
    expect(additional).toBeNull();
    expect(next).not.toHaveBeenCalled();
  });

  it("returns an error when middleware throws", async () => {
    const fail = new class extends CommandMiddleware {
      readonly name = "fail" as const;

      run(): CommandMiddlewareRun<NonNullable<unknown>> {
        throw new Error("middleware failed");
      }
    }();
    const next = vi.fn();

    const [err, additional] = await runMiddleware({
      use: [
        fail,
        { name: "next", run: next },
      ],
    } as any, context);

    expect(err).toBeInstanceOf(CommandError);
    expect(err?.message).toBe("failed to run middleware : middleware failed");
    expect(additional).toBeNull();
    expect(next).not.toHaveBeenCalled();
  });
});
