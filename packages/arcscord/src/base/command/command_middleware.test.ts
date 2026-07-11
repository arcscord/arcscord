import type { CommandContext } from "./command_context";
import type { CommandMiddlewareRun } from "./command_middleware";
import { describe, expect, it } from "vitest";
import { createMockCommandContext } from "#/testing";
import { CommandManager } from "../../manager/command/command_manager.class";
import { CommandMiddleware } from "./command_middleware";

class TestCommandMiddleware extends CommandMiddleware {
  readonly name = "test" as const;

  run(_ctx: CommandContext): CommandMiddlewareRun<{ allowed: true }> {
    return this.next({ allowed: true });
  }
}

const context = createMockCommandContext({ interaction: { kind: "unknown" } });
const runMiddleware = (
  CommandManager.prototype as unknown as {
    runMiddleware: (command: unknown, context: CommandContext) => Promise<{
      status: string;
      value?: object | false;
      failure?: unknown;
      defect?: unknown;
    }>;
  }
).runMiddleware;

describe("commandMiddleware", () => {
  it("creates discriminated next, cancel and failure results", () => {
    const middleware = new TestCommandMiddleware();
    expect(middleware.next({ allowed: true })).toEqual({ status: "next", value: { allowed: true } });
    expect(middleware.cancel()).toEqual({ status: "cancel" });
    expect(middleware.fail("denied")).toEqual({ status: "failure", failure: "denied" });
  });

  it("collects next values", async () => {
    const exit = await runMiddleware({ use: [new TestCommandMiddleware()] }, context);
    expect(exit).toEqual({ status: "success", value: { test: { allowed: true } } });
  });

  it("preserves explicit failures and distinguishes thrown defects", async () => {
    const failure = new class extends CommandMiddleware {
      readonly name = "failure" as const;
      run() { return this.fail({ _tag: "Denied" } as const); }
    }();
    const defect = new class extends CommandMiddleware {
      readonly name = "defect" as const;
      run(): CommandMiddlewareRun<NonNullable<unknown>> { throw new Error("boom"); }
    }();

    expect(await runMiddleware({ use: [failure] }, context)).toMatchObject({ status: "failure", failure: { _tag: "Denied" } });
    expect(await runMiddleware({ use: [defect] }, context)).toMatchObject({ status: "defect", defect: expect.any(Error) });
  });
});
