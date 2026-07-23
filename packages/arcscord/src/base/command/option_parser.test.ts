import type { ChatInputCommandInteraction, Guild } from "discord.js";
import type { Option, OptionsList } from "./option.type";
import { ChannelType } from "discord-api-types/v10";
import {
  Attachment,
  BaseChannel,
  GuildMember,
  Role,
  User,
} from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { parseOptions } from "./option_parser";

type InteractionOptions = {
  channelFetch?: ReturnType<typeof vi.fn>;
  getterOverrides?: Record<string, () => unknown>;
  roleFetch?: ReturnType<typeof vi.fn>;
  values?: Record<string, unknown>;
};

const optionKinds = [
  ["attachment", "getAttachment"],
  ["boolean", "getBoolean"],
  ["channel", "getChannel"],
  ["integer", "getInteger"],
  ["mentionable", "getMentionable"],
  ["number", "getNumber"],
  ["role", "getRole"],
  ["string", "getString"],
  ["user", "getUser"],
] as const;

function discordInstance<T>(prototype: object, properties: Record<string, unknown>): T {
  return Object.assign(Object.create(prototype), properties) as T;
}

function createInteraction(options: InteractionOptions = {}): ChatInputCommandInteraction {
  const values = options.values ?? {};
  const getValue = (name: string): unknown =>
    Object.hasOwn(values, name) ? values[name] : null;
  const resolver = {
    data: [{ name: "value" }],
    getAttachment: vi.fn((name: string) => getValue(name)),
    getBoolean: vi.fn((name: string) => getValue(name)),
    getChannel: vi.fn((name: string) => getValue(name)),
    getInteger: vi.fn((name: string) => getValue(name)),
    getMentionable: vi.fn((name: string) => getValue(name)),
    getNumber: vi.fn((name: string) => getValue(name)),
    getRole: vi.fn((name: string) => getValue(name)),
    getString: vi.fn((name: string) => getValue(name)),
    getUser: vi.fn((name: string) => getValue(name)),
    ...options.getterOverrides,
  };
  const guild = options.roleFetch || options.channelFetch
    ? {
        channels: { fetch: options.channelFetch ?? vi.fn() },
        roles: { fetch: options.roleFetch ?? vi.fn() },
      } as unknown as Guild
    : null;

  return {
    guild,
    guildId: guild ? "guild_1" : null,
    options: resolver,
  } as unknown as ChatInputCommandInteraction;
}

function definition(option: Option): OptionsList {
  return { value: option };
}

function baseOption(type: Option["type"], required = false): Option {
  return { type, description: "Value", required } as Option;
}

function createUser(): User {
  return discordInstance<User>(User.prototype, { id: "user_1" });
}

function createRole(): Role {
  return discordInstance<Role>(Role.prototype, { id: "role_1" });
}

function createAttachment(): Attachment {
  return discordInstance<Attachment>(Attachment.prototype, { id: "attachment_1" });
}

function createChannel(type = ChannelType.GuildText): BaseChannel {
  return discordInstance<BaseChannel>(BaseChannel.prototype, {
    id: "channel_1",
    isDMBased: () => type === ChannelType.DM || type === ChannelType.GroupDM,
    type,
  });
}

describe("parseOptions", () => {
  it.each(optionKinds)("normalizes an absent optional %s option", async (type) => {
    const [parseError, parsed] = await parseOptions(
      createInteraction(),
      definition(baseOption(type)),
    );

    expect(parseError).toBeNull();
    expect(parsed).toEqual({ value: undefined });
  });

  it.each(optionKinds)("rejects an absent required %s option", async (type) => {
    const [parseError, parsed] = await parseOptions(
      createInteraction(),
      definition(baseOption(type, true)),
    );

    expect(parsed).toBeNull();
    expect(parseError).toMatchObject({
      code: "COMMAND_OPTION_PARSING_FAILED",
      message: "Option value is required but was not provided.",
      metadata: {
        optionName: "value",
        optionType: type,
      },
    });
  });

  it("parses all directly resolved option families", async () => {
    const user = createUser();
    const role = createRole();
    const attachment = createAttachment();
    const channel = createChannel();
    const options = {
      attachment: baseOption("attachment"),
      boolean: baseOption("boolean"),
      channel: baseOption("channel"),
      integer: baseOption("integer"),
      mentionable: baseOption("mentionable"),
      number: baseOption("number"),
      role: baseOption("role"),
      string: baseOption("string"),
      user: baseOption("user"),
    };
    const interaction = createInteraction({
      values: {
        attachment,
        boolean: false,
        channel,
        integer: 0,
        mentionable: user,
        number: 1.5,
        role,
        string: "",
        user,
      },
    });

    const [parseError, parsed] = await parseOptions(interaction, options);

    expect(parseError).toBeNull();
    expect(parsed).toEqual({
      attachment,
      boolean: false,
      channel,
      integer: 0,
      mentionable: user,
      number: 1.5,
      role,
      string: "",
      user,
    });
  });

  it.each([
    [["one", "two"]],
    [[{ name: "One", value: "one" }, "two"]],
    [{ One: "one", Two: "two" }],
  ])("accepts every string choice representation", async (choices) => {
    const [parseError, parsed] = await parseOptions(
      createInteraction({ values: { value: "one" } }),
      definition({
        type: "string",
        description: "Value",
        choices,
      }),
    );

    expect(parseError).toBeNull();
    expect(parsed).toEqual({ value: "one" });
  });

  it.each([
    [[1, 2]],
    [[{ name: "One", value: 1 }, 2]],
    [{ One: 1, Two: 2 }],
  ])("accepts every numeric choice representation", async (choices) => {
    const [parseError, parsed] = await parseOptions(
      createInteraction({ values: { value: 1 } }),
      definition({
        type: "number",
        description: "Value",
        choices,
      }),
    );

    expect(parseError).toBeNull();
    expect(parsed).toEqual({ value: 1 });
  });

  it("accepts inclusive string and numeric boundaries", async () => {
    const [parseError, parsed] = await parseOptions(
      createInteraction({ values: { amount: 2, text: "ab" } }),
      {
        amount: {
          type: "number",
          description: "Amount",
          min_value: 2,
          max_value: 2,
        },
        text: {
          type: "string",
          description: "Text",
          min_length: 2,
          max_length: 2,
        },
      },
    );

    expect(parseError).toBeNull();
    expect(parsed).toEqual({ amount: 2, text: "ab" });
  });

  it.each([
    [{ type: "string", description: "Value", min_length: 2 }, "a", "Minimum length"],
    [{ type: "string", description: "Value", max_length: 2 }, "abc", "Maximum length"],
    [{ type: "number", description: "Value", min_value: 2 }, 1, "Minimum value"],
    [{ type: "number", description: "Value", max_value: 2 }, 3, "Maximum value"],
    [{ type: "string", description: "Value", choices: ["valid"] }, "invalid", "Invalid choice"],
    [{ type: "number", description: "Value", choices: [1] }, 2, "Invalid choice"],
  ] as const)("rejects a value outside its configured constraints", async (option, value, message) => {
    const [parseError] = await parseOptions(
      createInteraction({ values: { value } }),
      definition(option),
    );

    expect(parseError?.message).toContain(message);
  });

  it.each([
    ["number", Number.NaN],
    ["number", Number.POSITIVE_INFINITY],
    ["integer", 1.5],
    ["integer", Number.MAX_SAFE_INTEGER + 1],
  ] as const)("rejects invalid runtime values for %s options", async (type, value) => {
    const [parseError] = await parseOptions(
      createInteraction({ values: { value } }),
      definition(baseOption(type)),
    );

    expect(parseError).toMatchObject({
      code: "COMMAND_OPTION_PARSING_FAILED",
      metadata: { optionName: "value", optionType: type },
    });
  });

  it.each([
    ["attachment", { id: "attachment_1" }],
    ["boolean", "true"],
    ["string", 42],
    ["user", { id: "user_1" }],
  ] as const)("rejects an incoherent runtime value for %s options", async (type, value) => {
    const [parseError] = await parseOptions(
      createInteraction({ values: { value } }),
      definition(baseOption(type)),
    );

    expect(parseError).toMatchObject({
      code: "COMMAND_OPTION_PARSING_FAILED",
      metadata: { optionName: "value", optionType: type },
    });
  });

  it("normalizes getter exceptions into parsing errors with a cause", async () => {
    const cause = new Error("resolver failure");
    const [parseError] = await parseOptions(
      createInteraction({
        getterOverrides: {
          getString: () => {
            throw cause;
          },
        },
      }),
      definition(baseOption("string")),
    );

    expect(parseError).toMatchObject({
      code: "COMMAND_OPTION_PARSING_FAILED",
      cause,
      message: "Failed to read option value",
    });
  });

  it("rejects an unknown runtime option type", async () => {
    const [parseError] = await parseOptions(
      createInteraction(),
      definition({ type: "unknown", description: "Value" } as unknown as Option),
    );

    expect(parseError).toMatchObject({
      code: "COMMAND_OPTION_PARSING_FAILED",
      metadata: { optionName: "value", optionType: "unknown" },
    });
  });

  it("resolves partial roles and channels through their guild managers", async () => {
    const role = createRole();
    const channel = createChannel();
    const roleFetch = vi.fn().mockResolvedValue(role);
    const channelFetch = vi.fn().mockResolvedValue(channel);
    const [parseError, parsed] = await parseOptions(
      createInteraction({
        roleFetch,
        channelFetch,
        values: {
          channel: { id: "channel_1", type: ChannelType.GuildText },
          role: { id: "role_1" },
        },
      }),
      {
        channel: baseOption("channel"),
        role: baseOption("role"),
      },
    );

    expect(parseError).toBeNull();
    expect(parsed).toEqual({ channel, role });
    expect(roleFetch).toHaveBeenCalledWith("role_1");
    expect(channelFetch).toHaveBeenCalledWith("channel_1");
  });

  it.each([
    ["missing guild", undefined, null],
    ["missing result", vi.fn().mockResolvedValue(null), null],
    ["fetch exception", vi.fn().mockRejectedValue(new Error("fetch failed")), Error],
  ])("rejects a partial role with %s", async (_case, roleFetch, causeType) => {
    const [parseError] = await parseOptions(
      createInteraction({
        roleFetch: roleFetch ?? undefined,
        values: { value: { id: "role_1" } },
      }),
      definition(baseOption("role")),
    );

    expect(parseError).toMatchObject({
      code: "COMMAND_OPTION_PARSING_FAILED",
      message: expect.stringContaining("Failed to fetch role"),
    });
    if (causeType) {
      expect(parseError?.cause).toBeInstanceOf(causeType);
    }
  });

  it.each([
    ["missing guild", undefined, null],
    ["missing result", vi.fn().mockResolvedValue(null), null],
    ["fetch exception", vi.fn().mockRejectedValue(new Error("fetch failed")), Error],
  ])("rejects a partial channel with %s", async (_case, channelFetch, causeType) => {
    const [parseError] = await parseOptions(
      createInteraction({
        channelFetch: channelFetch ?? undefined,
        values: { value: { id: "channel_1", type: ChannelType.GuildText } },
      }),
      definition(baseOption("channel")),
    );

    expect(parseError).toMatchObject({
      code: "COMMAND_OPTION_PARSING_FAILED",
      message: expect.stringContaining("Failed to fetch channel"),
    });
    if (causeType) {
      expect(parseError?.cause).toBeInstanceOf(causeType);
    }
  });

  it("accepts only configured channel types", async () => {
    const accepted = createChannel(ChannelType.GuildText);
    const rejected = createChannel(ChannelType.GuildVoice);
    const option: Option = {
      type: "channel",
      description: "Channel",
      channel_types: ["guildText"],
    };
    const acceptedInteraction = createInteraction({ values: { value: accepted } });

    const [acceptedError] = await parseOptions(
      acceptedInteraction,
      definition(option),
    );
    const [rejectedError] = await parseOptions(
      createInteraction({ values: { value: rejected } }),
      definition(option),
    );

    expect(acceptedError).toBeNull();
    expect(rejectedError?.message).toContain("does not match");
    expect(acceptedInteraction.options.getChannel).toHaveBeenCalledWith(
      "value",
      false,
      [ChannelType.GuildText],
    );
  });

  it("rejects resolved DM channels", async () => {
    const [parseError] = await parseOptions(
      createInteraction({ values: { value: createChannel(ChannelType.DM) } }),
      definition(baseOption("channel")),
    );

    expect(parseError?.message).toContain("non-guild channel");
  });

  it("normalizes guild members to users for mentionable options", async () => {
    const user = createUser();
    const member = discordInstance<GuildMember>(GuildMember.prototype, { user });
    const [parseError, parsed] = await parseOptions(
      createInteraction({ values: { value: member } }),
      definition(baseOption("mentionable")),
    );

    expect(parseError).toBeNull();
    expect(parsed).toEqual({ value: user });
  });

  it("accepts roles and users but rejects unresolved mentionables", async () => {
    const role = createRole();
    const user = createUser();

    for (const value of [role, user]) {
      const [parseError] = await parseOptions(
        createInteraction({ values: { value } }),
        definition(baseOption("mentionable")),
      );
      expect(parseError).toBeNull();
    }

    const [parseError] = await parseOptions(
      createInteraction({ values: { value: { id: "partial_1" } } }),
      definition(baseOption("mentionable")),
    );
    expect(parseError?.message).toContain("Invalid value");
  });

  it("stops parsing after the first invalid option", async () => {
    const secondGetter = vi.fn(() => "not-run");
    const interaction = createInteraction({
      getterOverrides: { getString: secondGetter },
      values: { first: Number.NaN },
    });

    const [parseError] = await parseOptions(interaction, {
      first: baseOption("number"),
      second: baseOption("string"),
    });

    expect(parseError).not.toBeNull();
    expect(secondGetter).not.toHaveBeenCalled();
  });
});
