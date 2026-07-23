import type { NonNullish, Result } from "@arcscord/error";
import type { APIInteractionGuildMember } from "discord-api-types/v10";
import type {
  BaseInteraction,
  CommandInteraction,
  Guild,
  GuildMember,
  GuildTextBasedChannel,
  InteractionDeferReplyOptions,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessageComponentInteraction,
  MessagePayload,
  ModalSubmitInteraction,
  TextBasedChannel,
  User,
} from "discord.js";
import type i18next from "i18next";
import type { ArcscordError } from "#/utils/error/arcscord_error";
import type { ArcClient } from "../client";
import { error, ok } from "@arcscord/error";
import { InteractionOperationError } from "#/utils/error/class/interaction_operation_error";

/**
 * Base class shared by every interaction context (commands and components).
 *
 * Exposes the interaction's actor and location — `user`, `guild`, `member`,
 * `channel` and their ids — plus the {@link ArcClient} instance, the resolved
 * `locale` and its bound translation function `t`. The `InGuild` type parameter
 * narrows the guild-only fields: when `true` they are non-null, when `false`
 * they are `null`.
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

  /**
   * get a locale text, with language detected self
   */
  t: typeof i18next.t;

  /**
   * Detected i18next language used by this context.
   */
  locale: string;

  constructor(client: ArcClient, interaction: BaseInteraction, locale: string) {
    this.user = interaction.user;
    this.client = client;

    this.guild = interaction.guild as InGuild extends true ? Guild : null;
    this.guildId = interaction.guildId as InGuild extends true ? string : null;
    this.member = interaction.member as InGuild extends true ? GuildMember | APIInteractionGuildMember : null;
    this.channel = interaction.channel as InGuild extends true ? GuildTextBasedChannel | TextBasedChannel : null;
    this.channelId = interaction.channelId as InGuild extends true ? string : null;

    this.locale = locale;
    this.t = client.localeManager.enabled
      ? client.localeManager.i18n.getFixedT(locale)
      : client.localeManager.t;
  }

  /**
   * Create a success result
   */
  ok(value: string | true = true): Result<string | true, NonNullish> {
    return ok(value);
  }

  /**
   * Create an error result
   */
  error<E extends NonNullish>(failure: E): Result<string | true, E> {
    return error(failure);
  }
}

/**
 * Base class for interaction contexts backed by a repliable interaction
 * (commands and message components). Adds the shared `reply` / `editReply` /
 * `deferReply` operations and their `defer` / `hasReply` state. Autocomplete
 * contexts extend {@link InteractionContext} directly since an
 * `AutocompleteInteraction` cannot be replied to.
 *
 * @internal
 */
export class RepliableInteractionContext<
  InGuild extends true | false = true | false,
> extends InteractionContext<InGuild> {
  /** The repliable discord.js interaction backing this context. */
  declare interaction: CommandInteraction | MessageComponentInteraction | ModalSubmitInteraction;

  /**
   * Whether the reply to the interaction is deferred
   */
  defer: boolean = false;

  /**
   * Whether the interaction already has a reply
   */
  hasReply: boolean = false;

  /**
   * Reply to the interaction with options
   */
  async reply(
    options: MessagePayload | InteractionReplyOptions | string,
    extraOptions: Omit<InteractionReplyOptions, "content"> = {},
  ): Promise<Result<string | true, ArcscordError<"INTERACTION_OPERATION_FAILED">>> {
    try {
      await this.interaction.reply(
        typeof options === "string"
          ? { ...extraOptions, content: options }
          : options,
      );
      this.hasReply = true;
      return ok(true);
    }
    catch (e) {
      return error(new InteractionOperationError("reply", e));
    }
  }

  /**
   * Edit the reply to the interaction with options
   */
  async editReply(
    options: MessagePayload | InteractionEditReplyOptions | string,
    extraOptions: Omit<InteractionEditReplyOptions, "content"> = {},
  ): Promise<Result<string | true, ArcscordError<"INTERACTION_OPERATION_FAILED">>> {
    try {
      await this.interaction.editReply(
        typeof options === "string"
          ? { ...extraOptions, content: options }
          : options,
      );
      this.hasReply = true;
      return ok(true);
    }
    catch (e) {
      return error(new InteractionOperationError("editReply", e));
    }
  }

  /**
   * Defer the reply to the interaction
   */
  async deferReply(
    options: InteractionDeferReplyOptions,
  ): Promise<Result<string | true, ArcscordError<"INTERACTION_OPERATION_FAILED">>> {
    try {
      await this.interaction.deferReply(options);
      this.defer = true;
      return ok(true);
    }
    catch (e) {
      return error(new InteractionOperationError("deferReply", e));
    }
  }
}
