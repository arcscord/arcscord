import type { CommandMiddlewareRun } from "./command_middleware";
import { expectTypeOf, it } from "vitest";
import { createCommand } from "./command_func";
import { CommandMiddleware } from "./command_middleware";

class TrackerMiddleware extends CommandMiddleware {
  readonly name = "tracker" as const;

  run(): CommandMiddlewareRun<{ requestId: string }> {
    return this.next({ requestId: "req_123" });
  }
}

class AuthMiddleware extends CommandMiddleware {
  readonly name = "auth" as const;

  run(): CommandMiddlewareRun<{ userId: string; isAdmin: boolean }> {
    return this.next({ userId: "user_1", isAdmin: false });
  }
}

it("types ctx.additional from a single command middleware", () => {
  createCommand({
    slash: { name: "test", description: "Test" },
    use: [new TrackerMiddleware()],
    run: (ctx) => {
      expectTypeOf(ctx.additional.tracker).toEqualTypeOf<{ requestId: string }>();
      expectTypeOf(ctx.additional.tracker.requestId).toEqualTypeOf<string>();
      return ctx.ok();
    },
  });
});

it("types ctx.additional from multiple command middlewares", () => {
  createCommand({
    slash: { name: "test", description: "Test" },
    use: [new TrackerMiddleware(), new AuthMiddleware()],
    run: (ctx) => {
      expectTypeOf(ctx.additional.tracker).toEqualTypeOf<{ requestId: string }>();
      expectTypeOf(ctx.additional.auth).toEqualTypeOf<{ userId: string; isAdmin: boolean }>();
      expectTypeOf(ctx.additional.auth.isAdmin).toEqualTypeOf<boolean>();
      return ctx.ok();
    },
  });
});
