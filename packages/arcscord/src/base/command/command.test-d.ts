import type { Attachment, GuildBasedChannel, Message, Role, User } from "discord.js";
import { describe, expectTypeOf, it } from "vitest";
import { buildCommandWithSubs, createCommand } from "./command_func";

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
    subCommands: [fullCommand],
  });

  createCommand({
    build: {
      slash: {
        name: "search",
        description: "Search anime",
        options: {
          anime: { type: "string", description: "Anime name", autocomplete: true },
          year: { type: "integer", description: "Release year", autocomplete: true },
          hidden: { type: "boolean", description: "Hidden result" },
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

it("types slash command ctx.options from required and optional definitions", () => {
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

describe("slash command option types", () => {
  it("types required options without undefined", () => {
    createCommand({
      build: {
        slash: {
          name: "types",
          description: "Option types test",
          options: {
            text: { type: "string", description: "Text", required: true },
            count: { type: "integer", description: "Count", required: true },
            amount: { type: "number", description: "Amount", required: true },
            flag: { type: "boolean", description: "Flag", required: true },
            who: { type: "user", description: "User", required: true },
            where: { type: "channel", description: "Channel", required: true },
            which: { type: "role", description: "Role", required: true },
            mention: { type: "mentionable", description: "Mention", required: true },
            file: { type: "attachment", description: "Attachment", required: true },
          },
        },
      },
      run: (ctx) => {
        expectTypeOf(ctx.options.text).toEqualTypeOf<string>();
        expectTypeOf(ctx.options.count).toEqualTypeOf<number>();
        expectTypeOf(ctx.options.amount).toEqualTypeOf<number>();
        expectTypeOf(ctx.options.flag).toEqualTypeOf<boolean>();
        expectTypeOf(ctx.options.who).toEqualTypeOf<User>();
        expectTypeOf(ctx.options.where).toEqualTypeOf<GuildBasedChannel>();
        expectTypeOf(ctx.options.which).toEqualTypeOf<Role>();
        expectTypeOf(ctx.options.mention).toEqualTypeOf<User | Role>();
        expectTypeOf(ctx.options.file).toEqualTypeOf<Attachment>();
        return ctx.ok();
      },
    });
  });

  it("types optional options as T | undefined", () => {
    createCommand({
      build: {
        slash: {
          name: "optional",
          description: "Optional options test",
          options: {
            text: { type: "string", description: "Text" },
            count: { type: "integer", description: "Count" },
            amount: { type: "number", description: "Amount" },
            flag: { type: "boolean", description: "Flag" },
            who: { type: "user", description: "User" },
            where: { type: "channel", description: "Channel" },
            which: { type: "role", description: "Role" },
            mention: { type: "mentionable", description: "Mention" },
            file: { type: "attachment", description: "Attachment" },
          },
        },
      },
      run: (ctx) => {
        expectTypeOf(ctx.options.text).toEqualTypeOf<string | undefined>();
        expectTypeOf(ctx.options.count).toEqualTypeOf<number | undefined>();
        expectTypeOf(ctx.options.amount).toEqualTypeOf<number | undefined>();
        expectTypeOf(ctx.options.flag).toEqualTypeOf<boolean | undefined>();
        expectTypeOf(ctx.options.who).toEqualTypeOf<User | undefined>();
        expectTypeOf(ctx.options.where).toEqualTypeOf<GuildBasedChannel | undefined>();
        expectTypeOf(ctx.options.which).toEqualTypeOf<Role | undefined>();
        expectTypeOf(ctx.options.mention).toEqualTypeOf<User | Role | undefined>();
        expectTypeOf(ctx.options.file).toEqualTypeOf<Attachment | undefined>();
        return ctx.ok();
      },
    });
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
