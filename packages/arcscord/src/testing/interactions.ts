import type { ApplicationCommandOptionType } from "discord-api-types/v10";
import type {
  AutocompleteInteraction,
  ButtonInteraction,
  Channel,
  ChannelSelectMenuInteraction,
  CommandInteraction,
  Guild,
  GuildMember,
  MentionableSelectMenuInteraction,
  Message,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  PermissionsString,
  Role,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  User,
  UserSelectMenuInteraction,
} from "discord.js";
import { ApplicationCommandType, ComponentType, InteractionContextType } from "discord-api-types/v10";
import { PermissionsBitField } from "discord.js";
import { vi } from "vitest";

// ─── Shared types ────────────────────────────────────────────────────────────

export type MockUserOptions = {
  id?: string;
  username?: string;
};

export type MockBaseInteractionOptions = {
  appPermissions?: PermissionsString[];
  channel?: CommandInteraction["channel"];
  guild?: CommandInteraction["guild"];
  user?: MockUserOptions;
};

export type MockComponentInteractionOptions = {
  appPermissions?: PermissionsString[];
  channel?: MessageComponentInteraction["channel"];
  customId?: string;
  guild?: MessageComponentInteraction["guild"];
  memberPermissions?: PermissionsString[];
  user?: MockUserOptions;
};

export type MockMessageComponentInteractionOptions = MockComponentInteractionOptions & {
  message?: Partial<Message>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function createMockUser(options: MockUserOptions = {}): User {
  return {
    id: options.id ?? "user_1",
    username: options.username ?? "test-user",
  } as User;
}

function buildCommandInteractionBase(
  options: MockBaseInteractionOptions & {
    commandId?: string;
    commandName?: string;
    commandType: ApplicationCommandType;
    isChatInputCommand: boolean;
    isUserContextMenuCommand: boolean;
    isMessageContextMenuCommand: boolean;
  },
): Record<string, unknown> {
  return {
    command: {
      id: options.commandId ?? "cmd_1",
      name: options.commandName ?? "test",
      type: options.commandType,
      guildId: null,
      toJSON: () => ({}),
    },
    commandId: options.commandId ?? "cmd_1",
    commandName: options.commandName ?? "test",
    commandGuildId: null,
    user: createMockUser(options.user),
    guild: options.guild ?? null,
    guildId: null,
    member: null,
    channel: options.channel ?? null,
    channelId: null,
    context: InteractionContextType.Guild,
    authorizingIntegrationOwners: {},
    locale: "en-US",
    isCommand: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => options.isChatInputCommand,
    isUserContextMenuCommand: () => options.isUserContextMenuCommand,
    isMessageContextMenuCommand: () => options.isMessageContextMenuCommand,
    isRepliable: () => true,
    reply: vi.fn(async () => {}),
    editReply: vi.fn(async () => {}),
    deferReply: vi.fn(async () => {}),
    toJSON: () => ({}),
  };
}

function buildComponentInteractionBase(options: MockComponentInteractionOptions): Record<string, unknown> {
  return {
    channel: options.channel ?? null,
    appPermissions: new PermissionsBitField(options.appPermissions ?? []),
    customId: options.customId ?? "test",
    guild: options.guild ?? null,
    inGuild: () => options.guild !== null && options.guild !== undefined,
    memberPermissions: options.memberPermissions
      ? new PermissionsBitField(options.memberPermissions)
      : null,
    user: createMockUser(options.user),
    reply: vi.fn(async () => {}),
    editReply: vi.fn(async () => {}),
    deferReply: vi.fn(async () => {}),
    deferUpdate: vi.fn(async () => {}),
    showModal: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    isRepliable: () => true,
    isMessageComponent: () => true,
    isModalSubmit: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isUserSelectMenu: () => false,
    isRoleSelectMenu: () => false,
    isMentionableSelectMenu: () => false,
    isChannelSelectMenu: () => false,
  };
}

// ─── Command interactions ─────────────────────────────────────────────────────

export type MockCommandInteractionKind = "chatInput" | "messageContextMenu" | "unknown" | "userContextMenu";

export type MockCommandInteractionOptions = {
  appPermissions?: PermissionsString[];
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

/** Generic command interaction mock — use the specialized variants when possible. */
export function createMockCommandInteraction(
  options: MockCommandInteractionOptions = {},
): CommandInteraction {
  const kind = options.kind ?? "chatInput";

  return {
    channel: options.channel ?? null,
    commandId: options.commandId ?? "command_1",
    commandName: options.commandName ?? "test",
    commandGuildId: null,
    appPermissions: new PermissionsBitField(options.appPermissions ?? []),
    guild: options.guild ?? null,
    inGuild: () => options.guild !== null && options.guild !== undefined,
    isCommand: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => kind === "chatInput",
    isMessageContextMenuCommand: () => kind === "messageContextMenu",
    isUserContextMenuCommand: () => kind === "userContextMenu",
    options: options.options,
    targetId: options.targetId,
    targetMessage: options.targetMessage,
    user: createMockUser(options.user),
  } as unknown as CommandInteraction;
}

export type MockChatInputInteractionOptions = {
  commandId?: string;
  commandName?: string;
  user?: MockUserOptions;
  options?: {
    data?: unknown[];
    getSubcommand?: () => string | null;
    getSubcommandGroup?: () => string | null;
  };
};

/** Full slash command interaction, including fields required by CommandManager. */
export function createMockChatInputInteraction(
  options: MockChatInputInteractionOptions = {},
): CommandInteraction {
  return {
    ...buildCommandInteractionBase({
      commandId: options.commandId,
      commandName: options.commandName ?? "ping",
      user: options.user,
      commandType: ApplicationCommandType.ChatInput,
      isChatInputCommand: true,
      isUserContextMenuCommand: false,
      isMessageContextMenuCommand: false,
    }),
    options: {
      data: options.options?.data ?? [],
      getSubcommand: options.options?.getSubcommand ?? (() => null),
      getSubcommandGroup: options.options?.getSubcommandGroup ?? (() => null),
    },
  } as unknown as CommandInteraction;
}

export type MockUserContextMenuInteractionOptions = {
  commandId?: string;
  commandName?: string;
  user?: MockUserOptions;
  targetUser?: MockUserOptions;
  targetMember?: null;
};

/** User context menu interaction mock with targetUser. */
export function createMockUserContextMenuInteraction(
  options: MockUserContextMenuInteractionOptions = {},
): CommandInteraction {
  return {
    ...buildCommandInteractionBase({
      ...options,
      commandType: ApplicationCommandType.User,
      isChatInputCommand: false,
      isUserContextMenuCommand: true,
      isMessageContextMenuCommand: false,
    }),
    targetUser: createMockUser(options.targetUser ?? { id: "target_1" }),
    targetMember: options.targetMember ?? null,
  } as unknown as CommandInteraction;
}

export type MockMessageContextMenuInteractionOptions = {
  commandId?: string;
  commandName?: string;
  user?: MockUserOptions;
  targetMessage?: Partial<Message>;
};

/** Message context menu interaction mock with targetMessage. */
export function createMockMessageContextMenuInteraction(
  options: MockMessageContextMenuInteractionOptions = {},
): CommandInteraction {
  return {
    ...buildCommandInteractionBase({
      ...options,
      commandType: ApplicationCommandType.Message,
      isChatInputCommand: false,
      isUserContextMenuCommand: false,
      isMessageContextMenuCommand: true,
    }),
    targetMessage: options.targetMessage ?? ({ id: "msg_1" } as unknown as Partial<Message>),
  } as unknown as CommandInteraction;
}

// ─── Component interactions ───────────────────────────────────────────────────

/** Generic message component interaction — kept for backwards compatibility. */
export function createMockComponentInteraction(
  options: MockComponentInteractionOptions = {},
): MessageComponentInteraction {
  return buildComponentInteractionBase(options) as unknown as MessageComponentInteraction;
}

/** Button interaction mock. */
export function createMockButtonInteraction(
  options: MockMessageComponentInteractionOptions = {},
): ButtonInteraction {
  return {
    ...buildComponentInteractionBase(options),
    isButton: () => true,
    message: options.message ?? { id: "msg_1", components: [] },
  } as unknown as ButtonInteraction;
}

/** @deprecated Use createMockButtonInteraction. */
export const createMockMessageComponentInteraction: typeof createMockButtonInteraction = createMockButtonInteraction;

export type MockStringSelectMenuInteractionOptions = MockComponentInteractionOptions & {
  values?: string[];
};

/** String select menu interaction mock. */
export function createMockStringSelectMenuInteraction(
  options: MockStringSelectMenuInteractionOptions = {},
): StringSelectMenuInteraction {
  return {
    ...buildComponentInteractionBase(options),
    isStringSelectMenu: () => true,
    values: options.values ?? [],
  } as unknown as StringSelectMenuInteraction;
}

export type MockUserSelectMenuInteractionOptions = MockComponentInteractionOptions & {
  users?: User[];
};

/** User select menu interaction mock. */
export function createMockUserSelectMenuInteraction(
  options: MockUserSelectMenuInteractionOptions = {},
): UserSelectMenuInteraction {
  return {
    ...buildComponentInteractionBase(options),
    isUserSelectMenu: () => true,
    users: options.users ?? [],
    members: {},
  } as unknown as UserSelectMenuInteraction;
}

export type MockRoleSelectMenuInteractionOptions = MockComponentInteractionOptions & {
  roles?: Role[];
};

/** Role select menu interaction mock. */
export function createMockRoleSelectMenuInteraction(
  options: MockRoleSelectMenuInteractionOptions = {},
): RoleSelectMenuInteraction {
  return {
    ...buildComponentInteractionBase(options),
    isRoleSelectMenu: () => true,
    roles: options.roles ?? [],
  } as unknown as RoleSelectMenuInteraction;
}

export type MockMentionableSelectMenuInteractionOptions = MockComponentInteractionOptions & {
  users?: User[];
  roles?: Role[];
};

/** Mentionable select menu interaction mock. */
export function createMockMentionableSelectMenuInteraction(
  options: MockMentionableSelectMenuInteractionOptions = {},
): MentionableSelectMenuInteraction {
  return {
    ...buildComponentInteractionBase(options),
    isMentionableSelectMenu: () => true,
    users: options.users ?? [],
    roles: options.roles ?? [],
    members: {},
  } as unknown as MentionableSelectMenuInteraction;
}

export type MockChannelSelectMenuInteractionOptions = MockComponentInteractionOptions & {
  channels?: Channel[];
};

/** Channel select menu interaction mock. */
export function createMockChannelSelectMenuInteraction(
  options: MockChannelSelectMenuInteractionOptions = {},
): ChannelSelectMenuInteraction {
  return {
    ...buildComponentInteractionBase(options),
    isChannelSelectMenu: () => true,
    channels: options.channels ?? [],
  } as unknown as ChannelSelectMenuInteraction;
}

export type MockModalSubmitInteractionOptions = MockComponentInteractionOptions & {
  fields?: Record<string, string>;
};

/** Modal submit interaction mock. */
export function createMockModalSubmitInteraction(
  options: MockModalSubmitInteractionOptions = {},
): ModalSubmitInteraction {
  const rawFields = new Map(
    Object.entries(options.fields ?? {}).map(([customId, value]) => [
      customId,
      { customId, value, type: ComponentType.TextInput },
    ]),
  );

  return {
    ...buildComponentInteractionBase(options),
    isMessageComponent: () => false,
    isModalSubmit: () => true,
    fields: {
      fields: rawFields,
      getTextInputValue: (id: string) => options.fields?.[id] ?? "",
      getField: (id: string) => rawFields.get(id) ?? null,
    },
    message: null,
  } as unknown as ModalSubmitInteraction;
}

// ─── Guild / member ───────────────────────────────────────────────────────────

export type MockGuildOptions = {
  id?: string;
  name?: string;
};

/** Guild mock for tests that require a non-null guild. */
export function createMockGuild(options: MockGuildOptions = {}): Guild {
  return {
    id: options.id ?? "guild_1",
    name: options.name ?? "test-guild",
    available: true,
    members: { cache: new Map() },
    channels: { cache: new Map() },
    roles: { cache: new Map() },
  } as unknown as Guild;
}

export type MockGuildMemberOptions = {
  id?: string;
  displayName?: string;
  user?: MockUserOptions;
};

/** Guild member mock. */
export function createMockGuildMember(options: MockGuildMemberOptions = {}): GuildMember {
  const user = createMockUser(options.user ?? { id: options.id });
  return {
    id: user.id,
    user,
    displayName: options.displayName ?? user.username,
    roles: { cache: new Map() },
  } as unknown as GuildMember;
}

// ─── Autocomplete interaction ─────────────────────────────────────────────────

export type MockAutocompleteFocusedOption = {
  name: string;
  value: string;
  type?: ApplicationCommandOptionType;
};

export type MockAutocompleteInteractionOptions = {
  commandId?: string;
  commandName?: string;
  user?: MockUserOptions;
  focusedOption?: MockAutocompleteFocusedOption;
  getSubcommand?: () => string | null;
  getSubcommandGroup?: () => string | null;
};

/**
 * Autocomplete interaction mock.
 *
 * Returns both the interaction and the `respond` spy so the caller can assert
 * on the choices that were sent back.
 */
export function createMockAutocompleteInteraction(options: MockAutocompleteInteractionOptions = {}): {
  interaction: AutocompleteInteraction;
  respond: ReturnType<typeof vi.fn>;
} {
  const respond = vi.fn();
  const focused = options.focusedOption ?? { name: "option", value: "" };

  const interaction = {
    channel: null,
    commandId: options.commandId ?? "cmd_1",
    commandName: options.commandName ?? "test",
    commandGuildId: null,
    command: {
      id: options.commandId ?? "cmd_1",
      name: options.commandName ?? "test",
      type: ApplicationCommandType.ChatInput,
      guildId: null,
      toJSON: () => ({}),
    },
    guild: null,
    locale: "en-US",
    isCommand: () => false,
    isAutocomplete: () => true,
    isChatInputCommand: () => false,
    options: {
      getFocused: (full: boolean) => full
        ? { name: focused.name, value: focused.value, type: focused.type }
        : focused.value,
      getSubcommand: options.getSubcommand ?? (() => null),
      getSubcommandGroup: options.getSubcommandGroup ?? (() => null),
    },
    respond,
    user: createMockUser(options.user),
  } as unknown as AutocompleteInteraction;

  return { interaction, respond };
}
