import type { APIInteractionGuildMember } from "discord-api-types/v10";
import type { BaseInteraction, Guild, GuildMember, GuildTextBasedChannel, TextBasedChannel, User } from "discord.js";
import type { ArcClient } from "../client";

/**
 * Base class shared by every interaction context (commands and components).
 *
 * Exposes the interaction's actor and location — `user`, `guild`, `member`,
 * `channel` and their ids — plus the {@link ArcClient} instance. The `InGuild`
 * type parameter narrows the guild-only fields: when `true` they are non-null,
 * when `false` they are `null`.
 *
 * @typeParam InGuild - Whether the interaction is known to originate from a guild.
 */
export class InteractionContext<InGuild extends true | false = true | false> {
  /**
   * The user of the context
   */
  user: User;

  /**
   * The guild of the context
   */
  guild: InGuild extends true ? Guild : null;

  /**
   * The id of the guild of the context
   */
  guildId: InGuild extends true ? string : null;

  /**
   * The member of the context
   */
  member: InGuild extends true ? GuildMember | APIInteractionGuildMember : null;

  /**
   * The channel of the context
   */
  channel: InGuild extends true ? GuildTextBasedChannel | TextBasedChannel : null;

  /**
   * The id of the channel of the context
   */
  channelId: InGuild extends true ? string : null;

  /**
   * get client instance
   */
  client: ArcClient;

  constructor(client: ArcClient, interaction: BaseInteraction) {
    this.user = interaction.user;
    this.client = client;

    this.guild = interaction.guild as InGuild extends true ? Guild : null;
    this.guildId = interaction.guildId as InGuild extends true ? string : null;
    this.member = interaction.member as InGuild extends true ? GuildMember | APIInteractionGuildMember : null;
    this.channel = interaction.channel as InGuild extends true ? GuildTextBasedChannel | TextBasedChannel : null;
    this.channelId = interaction.channelId as InGuild extends true ? string : null;
  }
}
