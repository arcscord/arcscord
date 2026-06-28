import type { Message, User } from "discord.js";
import { expectTypeOf, it } from "vitest";
import { buildCommandWithSubs, createCommand } from "#/base/command/command_func";

it("types autocomplete handlers from their option definitions", () => {
  const fullCommand = createCommand({
    build: {
      name: "full",
      description: "Full command",
    },
    run: ctx => ctx.ok(),
  });

  buildCommandWithSubs({
    name: "sub",
    description: "Subcommands",
    subCommands: [
      fullCommand,
    ],
  });

  createCommand({
    build: {
      slash: {
        name: "search",
        description: "Search anime",
        options: {
          anime: {
            type: "string",
            description: "Anime name",
            autocomplete: true,
          },
          year: {
            type: "integer",
            description: "Release year",
            autocomplete: true,
          },
          hidden: {
            type: "boolean",
            description: "Hidden result",
          },
        },
      },
    },
    autocomplete: {
      anime: (ctx) => {
        expectTypeOf(ctx.name).toEqualTypeOf<"anime">();
        expectTypeOf(ctx.value).toEqualTypeOf<string>();
        void ctx.sendChoices(["Naruto"]);
        // @ts-expect-error string autocomplete choices cannot be numeric-only.
        void ctx.sendChoices([2002]);
        return ctx.ok();
      },
      year: (ctx) => {
        expectTypeOf(ctx.name).toEqualTypeOf<"year">();
        expectTypeOf(ctx.value).toEqualTypeOf<string>();
        void ctx.sendChoices([2002]);
        // @ts-expect-error numeric autocomplete choices cannot be string-only.
        void ctx.sendChoices(["Naruto"]);
        return ctx.ok();
      },
      // @ts-expect-error only options with autocomplete: true can have handlers.
      hidden: ctx => ctx.ok(),
    },
    run: ctx => ctx.ok(),
  });
});

it("types slash command ctx.options from option definitions", () => {
  createCommand({
    build: {
      slash: {
        name: "search",
        description: "Search",
        options: {
          query: { type: "string", description: "Query" },
          limit: { type: "integer", description: "Limit", required: false },
          exact: { type: "boolean", description: "Exact match", required: true },
        },
      },
    },
    run: (ctx) => {
      expectTypeOf(ctx.options.query).toEqualTypeOf<string | undefined>();
      expectTypeOf(ctx.options.limit).toEqualTypeOf<number | undefined>();
      expectTypeOf(ctx.options.exact).toEqualTypeOf<boolean>();
      return ctx.ok();
    },
  });
});

it("types user command ctx.targetUser as User", () => {
  createCommand({
    build: {
      user: { name: "Inspect user" },
    },
    run: (ctx) => {
      expectTypeOf(ctx.targetUser).toEqualTypeOf<User>();
      return ctx.ok();
    },
  });
});

it("types message command ctx.targetMessage as Message", () => {
  createCommand({
    build: {
      message: { name: "Inspect message" },
    },
    run: (ctx) => {
      expectTypeOf(ctx.targetMessage).toEqualTypeOf<Message>();
      return ctx.ok();
    },
  });
});
