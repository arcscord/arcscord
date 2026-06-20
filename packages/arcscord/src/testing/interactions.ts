import type {
  CommandInteraction,
  Message,
  MessageComponentInteraction,
  User,
} from "discord.js";

export type MockUserOptions = {
  id?: string;
  username?: string;
};

export type MockCommandInteractionKind = "chatInput" | "messageContextMenu" | "unknown" | "userContextMenu";

export type MockCommandInteractionOptions = {
  channel?: CommandInteraction["channel"];
  commandId?: string;
  commandName?: string;
  kind?: MockCommandInteractionKind;
  guild?: CommandInteraction["guild"];
  options?: unknown;
  targetId?: string;
  targetMessage?: Partial<Message>;
  user?: MockUserOptions;
};

export type MockComponentInteractionOptions = {
  channel?: MessageComponentInteraction["channel"];
  customId?: string;
  guild?: MessageComponentInteraction["guild"];
  user?: MockUserOptions;
};

export function createMockUser(options: MockUserOptions = {}): User {
  return {
    id: options.id ?? "user_1",
    username: options.username ?? "test-user",
  } as User;
}

export function createMockCommandInteraction(
  options: MockCommandInteractionOptions = {},
): CommandInteraction {
  const kind = options.kind ?? "chatInput";

  return {
    channel: options.channel ?? null,
    commandId: options.commandId ?? "command_1",
    commandName: options.commandName ?? "test",
    guild: options.guild ?? null,
    isChatInputCommand: () => kind === "chatInput",
    isMessageContextMenuCommand: () => kind === "messageContextMenu",
    isUserContextMenuCommand: () => kind === "userContextMenu",
    options: options.options,
    targetId: options.targetId,
    targetMessage: options.targetMessage,
    user: createMockUser(options.user),
  } as unknown as CommandInteraction;
}

export function createMockComponentInteraction(
  options: MockComponentInteractionOptions = {},
): MessageComponentInteraction {
  return {
    channel: options.channel ?? null,
    customId: options.customId ?? "test",
    guild: options.guild ?? null,
    user: createMockUser(options.user),
  } as unknown as MessageComponentInteraction;
}
