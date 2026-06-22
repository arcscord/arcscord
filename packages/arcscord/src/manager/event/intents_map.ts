import type { ClientEvents, GatewayIntentsString } from "discord.js";

export type EventIntentCoverageTarget = "guild" | "dm";

export type EventIntentAlternatives = Partial<Record<EventIntentCoverageTarget, GatewayIntentsString>>;

export type EventIntentRequirement
  = | {
    mode: "none";
  }
  | {
    mode: "all";
    intents: GatewayIntentsString[];
  }
  | {
    mode: "oneOf";
    intents: EventIntentAlternatives;
  };

const none = { mode: "none" } satisfies EventIntentRequirement;
const all = (...intents: GatewayIntentsString[]): EventIntentRequirement => ({ mode: "all", intents });
const oneOf = (intents: EventIntentAlternatives): EventIntentRequirement => ({ mode: "oneOf", intents });

/**
 * Maps discord.js client events to the gateway intents documented by Discord.
 *
 * Source: https://docs.discord.com/developers/events/gateway#list-of-intents
 * This map is constrained to the events exposed by the installed discord.js
 * `ClientEvents` type. Gateway events not exposed by discord.js are intentionally
 * omitted until discord.js exposes matching client events.
 */
export const intentsMap = {
  guildCreate: all("Guilds"),
  guildUpdate: all("Guilds"),
  guildDelete: all("Guilds"),
  roleCreate: all("Guilds"),
  roleUpdate: all("Guilds"),
  roleDelete: all("Guilds"),
  channelCreate: all("Guilds"),
  channelUpdate: all("Guilds"),
  channelDelete: all("Guilds"),
  channelPinsUpdate: oneOf({ guild: "Guilds", dm: "DirectMessages" }),
  threadCreate: all("Guilds"),
  threadUpdate: all("Guilds"),
  threadDelete: all("Guilds"),
  threadListSync: all("Guilds"),
  threadMemberUpdate: all("Guilds"),
  threadMembersUpdate: all("Guilds", "GuildMembers"),
  stageInstanceCreate: all("Guilds"),
  stageInstanceUpdate: all("Guilds"),
  stageInstanceDelete: all("Guilds"),

  guildMemberAdd: all("GuildMembers"),
  guildMemberUpdate: all("GuildMembers"),
  guildMemberRemove: all("GuildMembers"),

  guildAuditLogEntryCreate: all("GuildModeration"),
  guildBanAdd: all("GuildModeration"),
  guildBanRemove: all("GuildModeration"),

  emojiCreate: all("GuildExpressions"),
  emojiUpdate: all("GuildExpressions"),
  emojiDelete: all("GuildExpressions"),
  stickerCreate: all("GuildExpressions"),
  stickerUpdate: all("GuildExpressions"),
  stickerDelete: all("GuildExpressions"),
  guildSoundboardSoundCreate: all("GuildExpressions"),
  guildSoundboardSoundDelete: all("GuildExpressions"),
  guildSoundboardSoundUpdate: all("GuildExpressions"),
  guildSoundboardSoundsUpdate: all("GuildExpressions"),
  soundboardSounds: all("GuildExpressions"),

  guildIntegrationsUpdate: all("GuildIntegrations"),

  webhooksUpdate: all("GuildWebhooks"),
  webhookUpdate: all("GuildWebhooks"),

  inviteCreate: all("GuildInvites"),
  inviteDelete: all("GuildInvites"),

  voiceStateUpdate: all("GuildVoiceStates"),
  voiceChannelEffectSend: all("GuildVoiceStates"),

  presenceUpdate: all("GuildPresences"),

  messageCreate: oneOf({ guild: "GuildMessages", dm: "DirectMessages" }),
  messageUpdate: oneOf({ guild: "GuildMessages", dm: "DirectMessages" }),
  messageDelete: oneOf({ guild: "GuildMessages", dm: "DirectMessages" }),
  messageDeleteBulk: all("GuildMessages"),

  messageReactionAdd: oneOf({ guild: "GuildMessageReactions", dm: "DirectMessageReactions" }),
  messageReactionRemove: oneOf({ guild: "GuildMessageReactions", dm: "DirectMessageReactions" }),
  messageReactionRemoveAll: oneOf({ guild: "GuildMessageReactions", dm: "DirectMessageReactions" }),
  messageReactionRemoveEmoji: oneOf({ guild: "GuildMessageReactions", dm: "DirectMessageReactions" }),

  typingStart: oneOf({ guild: "GuildMessageTyping", dm: "DirectMessageTyping" }),

  guildScheduledEventCreate: all("GuildScheduledEvents"),
  guildScheduledEventUpdate: all("GuildScheduledEvents"),
  guildScheduledEventDelete: all("GuildScheduledEvents"),
  guildScheduledEventUserAdd: all("GuildScheduledEvents"),
  guildScheduledEventUserRemove: all("GuildScheduledEvents"),

  autoModerationRuleCreate: all("AutoModerationConfiguration"),
  autoModerationRuleUpdate: all("AutoModerationConfiguration"),
  autoModerationRuleDelete: all("AutoModerationConfiguration"),

  autoModerationActionExecution: all("AutoModerationExecution"),

  messagePollVoteAdd: oneOf({ guild: "GuildMessagePolls", dm: "DirectMessagePolls" }),
  messagePollVoteRemove: oneOf({ guild: "GuildMessagePolls", dm: "DirectMessagePolls" }),

  ready: none,
  error: none,
  debug: none,
  warn: none,
  applicationCommandPermissionsUpdate: none,
  cacheSweep: none,
  clientReady: none,
  entitlementCreate: none,
  entitlementUpdate: none,
  entitlementDelete: none,
  guildAvailable: none,
  guildUnavailable: none,
  guildMemberAvailable: none,
  guildMembersChunk: none,
  invalidated: none,
  interactionCreate: none,
  subscriptionCreate: none,
  subscriptionDelete: none,
  subscriptionUpdate: none,
  userUpdate: none,
  shardDisconnect: none,
  shardError: none,
  shardReady: none,
  shardReconnecting: none,
  shardResume: none,
} satisfies Record<keyof ClientEvents, EventIntentRequirement>;
