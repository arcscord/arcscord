import type { ComponentMiddlewareRun } from "./component_middleware";
import { expectTypeOf, it } from "vitest";
import { button as buttonComponent } from "../shared/builders";
import { createButton } from "./component_handler.func";
import { ComponentMiddleware } from "./component_middleware";

class AuthorMiddleware extends ComponentMiddleware {
  readonly name = "authorCheck" as const;

  run(): ComponentMiddlewareRun<{ isAuthor: boolean }> {
    return this.next({ isAuthor: true });
  }
}

class RateLimitMiddleware extends ComponentMiddleware {
  readonly name = "rateLimit" as const;

  run(): ComponentMiddlewareRun<{ remaining: number }> {
    return this.next({ remaining: 5 });
  }
}

it("types ctx.additional from a single component middleware", () => {
  createButton({
    route: "secure_button",
    build: id => buttonComponent({ customId: id(), style: "primary", label: "Click" }),
    use: [new AuthorMiddleware()],
    run: (ctx) => {
      expectTypeOf(ctx.additional.authorCheck).toEqualTypeOf<{ isAuthor: boolean }>();
      expectTypeOf(ctx.additional.authorCheck.isAuthor).toEqualTypeOf<boolean>();
      return ctx.ok();
    },
  });
});

it("types ctx.additional from multiple component middlewares", () => {
  createButton({
    route: "gated_button",
    build: id => buttonComponent({ customId: id(), style: "secondary", label: "Go" }),
    use: [new AuthorMiddleware(), new RateLimitMiddleware()],
    run: (ctx) => {
      expectTypeOf(ctx.additional.authorCheck).toEqualTypeOf<{ isAuthor: boolean }>();
      expectTypeOf(ctx.additional.rateLimit).toEqualTypeOf<{ remaining: number }>();
      expectTypeOf(ctx.additional.rateLimit.remaining).toEqualTypeOf<number>();
      return ctx.ok();
    },
  });
});
