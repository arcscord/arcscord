import type { CommandContext, ComponentContext } from "arcscord";
import type { PermissionsString } from "discord.js";
import { PermissionsBitField } from "discord.js";
import { vi } from "vitest";

type MockContextOptions = {
  defer?: boolean;
  memberPermissions?: PermissionsString[];
  userId?: string;
};

// eslint-disable-next-line ts/explicit-function-return-type
function createBaseContext(options: MockContextOptions = {}) {
  const userId = options.userId ?? "user_1";

  return {
    defer: options.defer ?? false,
    editReply: vi.fn().mockResolvedValue([null, true]),
    member: options.memberPermissions
      ? {
          permissions: new PermissionsBitField(options.memberPermissions),
        }
      : null,
    reply: vi.fn().mockResolvedValue([null, true]),
    user: {
      id: userId,
    },
  };
}

export function createMockCommandContext(options: MockContextOptions = {}): CommandContext {
  return createBaseContext(options) as unknown as CommandContext;
}

export function createMockComponentContext(options: MockContextOptions = {}): ComponentContext {
  return createBaseContext(options) as unknown as ComponentContext;
}
