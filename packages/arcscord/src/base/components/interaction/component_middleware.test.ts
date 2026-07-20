import type { ComponentMiddlewareRun } from "./component_middleware";
import type { ComponentContext } from "./context";
import { describe, expect, it } from "vitest";
import { ComponentManager } from "#/manager/component/component_manager.class";
import { createMockComponentContext } from "#/testing";
import { ComponentMiddleware } from "./component_middleware";

class TestComponentMiddleware extends ComponentMiddleware {
  readonly name = "test" as const;
  run(_ctx: ComponentContext): ComponentMiddlewareRun<{ allowed: true }> {
    return this.next({ allowed: true });
  }
}

const context = createMockComponentContext();
const runMiddleware = (
  ComponentManager.prototype as unknown as {
    runMiddleware: (component: unknown, context: ComponentContext) => Promise<{
      status: string;
      value?: object | false;
      failure?: unknown;
      defect?: unknown;
    }>;
  }
).runMiddleware;

describe("componentMiddleware", () => {
  it("creates discriminated next, cancel and failure results", () => {
    const middleware = new TestComponentMiddleware();
    expect(middleware.next({ allowed: true })).toEqual({ status: "next", value: { allowed: true } });
    expect(middleware.cancel()).toEqual({ status: "cancel" });
    expect(middleware.fail("denied")).toEqual({ status: "failure", failure: "denied" });
  });

  it("collects next values", async () => {
    const exit = await runMiddleware({ use: [new TestComponentMiddleware()] }, context);
    expect(exit).toEqual({ status: "success", value: { test: { allowed: true } } });
  });

  it("preserves explicit failures and distinguishes thrown defects", async () => {
    const failure = new class extends ComponentMiddleware {
      readonly name = "failure" as const;
      run() { return this.fail({ _tag: "Denied" } as const); }
    }();
    const defect = new class extends ComponentMiddleware {
      readonly name = "defect" as const;
      run(): ComponentMiddlewareRun<NonNullable<unknown>> { throw new Error("boom"); }
    }();

    expect(await runMiddleware({ use: [failure] }, context)).toMatchObject({ status: "failure", failure: { _tag: "Denied" } });
    expect(await runMiddleware({ use: [defect] }, context)).toMatchObject({ status: "defect", defect: expect.any(Error) });
  });
});
