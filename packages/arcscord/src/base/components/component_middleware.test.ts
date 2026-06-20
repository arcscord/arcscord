import type { ComponentMiddlewareRun } from "./component_middleware";
import type { ComponentContext } from "./context";
import { ok } from "@arcscord/error";
import { describe, expect, it, vi } from "vitest";
import { ComponentManager } from "../../manager/component/component_manager.class";
import { ComponentError } from "../../utils/error/class/component_error";
import { ComponentMiddleware } from "./component_middleware";

class TestComponentMiddleware extends ComponentMiddleware {
  readonly name = "test" as const;

  run(_ctx: ComponentContext): ComponentMiddlewareRun<{ allowed: true }> {
    return this.next({ allowed: true });
  }
}

const interaction = {
  channel: null,
  guild: null,
  user: {
    id: "user_1",
    username: "test-user",
  },
};

const context = {
  interaction,
} as ComponentContext;

const runMiddleware = (
  ComponentManager.prototype as unknown as {
    runMiddleware: (props: unknown, context: ComponentContext) => Promise<[ComponentError | null, object | false | null]>;
  }
).runMiddleware;

describe("componentMiddleware", () => {
  it("creates a next result", () => {
    const middleware = new TestComponentMiddleware();
    const next = { allowed: true };

    expect(middleware.next(next)).toEqual({
      cancel: null,
      error: null,
      next,
    });
  });

  it("creates a cancel result", () => {
    const middleware = new TestComponentMiddleware();
    const cancel = Promise.resolve(ok(true));

    expect(middleware.cancel(cancel)).toEqual({
      cancel,
      error: null,
      next: null,
    });
  });

  it("creates an error result", () => {
    const middleware = new TestComponentMiddleware();
    const error = new ComponentError({ message: "middleware failed", interaction: interaction as any });

    expect(middleware.error(error)).toEqual({
      cancel: null,
      error,
      next: null,
    });
  });

  it("collects next values while middleware continues", async () => {
    const middleware = new TestComponentMiddleware();

    const [err, additional] = await runMiddleware({ use: [middleware] } as any, context);

    expect(err).toBeNull();
    expect(additional).toEqual({ test: { allowed: true } });
  });

  it("returns an error when middleware names are duplicated", async () => {
    const first = new TestComponentMiddleware();
    const second = new TestComponentMiddleware();
    const firstRun = vi.spyOn(first, "run");
    const secondRun = vi.spyOn(second, "run");

    const [err, additional] = await runMiddleware({ use: [first, second] } as any, context);

    expect(err).toBeInstanceOf(ComponentError);
    expect(err?.message).toBe("duplicate middleware name \"test\"");
    expect(additional).toBeNull();
    expect(firstRun).not.toHaveBeenCalled();
    expect(secondRun).not.toHaveBeenCalled();
  });

  it("stops when middleware cancels", async () => {
    const cancel = new class extends ComponentMiddleware {
      readonly name = "cancel" as const;

      run(): ComponentMiddlewareRun<NonNullable<unknown>> {
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
    const middlewareError = new ComponentError({ message: "middleware failed", interaction: interaction as any });
    const fail = new class extends ComponentMiddleware {
      readonly name = "fail" as const;

      run(): ComponentMiddlewareRun<NonNullable<unknown>> {
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
    const fail = new class extends ComponentMiddleware {
      readonly name = "fail" as const;

      run(): ComponentMiddlewareRun<NonNullable<unknown>> {
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

    expect(err).toBeInstanceOf(ComponentError);
    expect(err?.message).toBe("failed to run middleware : middleware failed");
    expect(additional).toBeNull();
    expect(next).not.toHaveBeenCalled();
  });
});
