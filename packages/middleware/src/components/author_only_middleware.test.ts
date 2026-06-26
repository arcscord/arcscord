import type { ComponentContext } from "arcscord";
import { createMockComponentContext } from "arcscord/testing";
import { MessageFlags } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { AuthorOnlyMiddleware } from "./author_only_middleware";

function createContext(options: Parameters<typeof createMockComponentContext>[0] = {}) {
  return createMockComponentContext({
    ...options,
    mockFunction: implementation => vi.fn(implementation),
  });
}

function withMessageMetadata(ctx: ComponentContext, userId?: string): ComponentContext {
  return {
    ...ctx,
    isMessageComponentContext: () => true,
    message: userId
      ? {
          interactionMetadata: {
            user: {
              id: userId,
            },
          },
        }
      : {},
  } as ComponentContext;
}

describe("authorOnlyMiddleware", () => {
  it("continues with author status for the original interaction author", () => {
    const middleware = new AuthorOnlyMiddleware({
      content: "Author only",
    });
    const ctx = withMessageMetadata(createContext({ userId: "user_1" }), "user_1");

    expect(middleware.run(ctx)).toEqual({
      cancel: null,
      error: null,
      next: {
        status: "author",
      },
    });
  });

  it("continues with ignore status outside message component contexts", () => {
    const middleware = new AuthorOnlyMiddleware({
      content: "Author only",
    });
    const ctx = {
      ...createContext(),
      isMessageComponentContext: () => false,
    } as ComponentContext;

    expect(middleware.run(ctx)).toEqual({
      cancel: null,
      error: null,
      next: {
        status: "ignore",
      },
    });
  });

  it("continues with ignore status when the original interaction author is unavailable", () => {
    const middleware = new AuthorOnlyMiddleware({
      content: "Author only",
    });
    const ctx = withMessageMetadata(createContext());

    expect(middleware.run(ctx)).toEqual({
      cancel: null,
      error: null,
      next: {
        status: "ignore",
      },
    });
  });

  it("cancels with a localized reply for another user", async () => {
    const translate = vi.fn((key: string) => `translated:${key}`);
    const middleware = new AuthorOnlyMiddleware(({ ctx, locale, t: fixedT }) => ({
      content: `${locale}:${ctx.user.id}:${fixedT("middleware.author_only")}`,
    }));
    const ctx = withMessageMetadata(createContext({
      locale: "fr",
      t: translate as never,
      userId: "user_2",
    }), "user_1");

    const result = middleware.run(ctx);

    expect(result.next).toBeNull();
    expect(result.error).toBeNull();
    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(ctx.reply).toHaveBeenCalledWith({
      content: "fr:user_2:translated:middleware.author_only",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("cancels with an edit reply when the interaction is deferred", async () => {
    const middleware = new AuthorOnlyMiddleware({
      content: "Author only",
    });
    const ctx = withMessageMetadata(createContext({
      defer: true,
      userId: "user_2",
    }), "user_1");

    const result = middleware.run(ctx);

    expect(result.cancel).not.toBeNull();
    await result.cancel;
    expect(ctx.editReply).toHaveBeenCalledWith({
      content: "Author only",
    });
  });
});
