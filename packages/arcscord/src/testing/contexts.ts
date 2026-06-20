import type { PermissionsString } from "discord.js";
import type { CommandRunResult, ComponentRunResult } from "#/base";
import type { CommandContext } from "#/base/command/command_context";
import type { ComponentContext } from "#/base/components/context";
import type { MockCommandInteractionOptions, MockComponentInteractionOptions } from "./interactions";
import type { MockFunctionFactory } from "./mock_function";
import { ok } from "@arcscord/error";
import { PermissionsBitField } from "discord.js";
import { createMockCommandInteraction, createMockComponentInteraction } from "./interactions";
import { createMockHandler } from "./mock_function";

export type MockContextOptions = {
  defer?: boolean;
  hasReply?: boolean;
  memberPermissions?: PermissionsString[];
  mockFunction?: MockFunctionFactory;
  userId?: string;
};

export type MockCommandContextOptions = MockContextOptions & {
  command?: unknown;
  interaction?: MockCommandInteractionOptions;
};

export type MockComponentContextOptions = MockContextOptions & {
  interaction?: MockComponentInteractionOptions;
};

type MockContextReply = (
  ...args: Parameters<CommandContext["reply"]>
) => Promise<CommandRunResult | ComponentRunResult>;

type MockContextEditReply = (
  ...args: Parameters<CommandContext["editReply"]>
) => Promise<CommandRunResult | ComponentRunResult>;

type MockBaseContext = {
  defer: boolean;
  editReply: MockContextEditReply;
  hasReply: boolean;
  member: {
    permissions: PermissionsBitField;
  } | null;
  reply: MockContextReply;
  user: {
    id: string;
  };
};

function createBaseContext(options: MockContextOptions = {}): MockBaseContext {
  const userId = options.userId ?? "user_1";

  return {
    defer: options.defer ?? false,
    editReply: createMockHandler(async () => ok(true as const), options.mockFunction),
    hasReply: options.hasReply ?? false,
    member: options.memberPermissions
      ? {
          permissions: new PermissionsBitField(options.memberPermissions),
        }
      : null,
    reply: createMockHandler(async () => ok(true as const), options.mockFunction),
    user: {
      id: userId,
    },
  };
}

export function createMockCommandContext(options: MockCommandContextOptions = {}): CommandContext {
  const interaction = createMockCommandInteraction({
    ...options.interaction,
    user: {
      ...options.interaction?.user,
      id: options.interaction?.user?.id ?? options.userId,
    },
  });

  return {
    ...createBaseContext(options),
    command: options.command ?? {},
    interaction,
  } as unknown as CommandContext;
}

export function createMockComponentContext(options: MockComponentContextOptions = {}): ComponentContext {
  const interaction = createMockComponentInteraction({
    ...options.interaction,
    user: {
      ...options.interaction?.user,
      id: options.interaction?.user?.id ?? options.userId,
    },
  });

  return {
    ...createBaseContext(options),
    customId: interaction.customId,
    interaction,
  } as unknown as ComponentContext;
}
