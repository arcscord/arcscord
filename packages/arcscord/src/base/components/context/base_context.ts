import type {
  ArcClient,
  ButtonContext,
  ChannelSelectMenuContext,
  MentionableSelectMenuContext,
  MessageComponentContext,
  ModalContext,
  RoleSelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "#/base";
import type { ComponentRunResult, SelectMenuContext } from "#/base/components";
import type { ComponentMiddleware } from "#/base/components/component_middleware";
import type {
  InteractionDeferReplyOptions,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessageComponentInteraction,
  MessagePayload,
  ModalSubmitInteraction,
} from "discord.js";
import type i18next from "i18next";
import { type ContextDocs, InteractionContext } from "#/base/utils";
import { ComponentError, type ComponentErrorOptions } from "#/utils";
import { anyToError, error, ok } from "@arcscord/error";

/**
 * @internal
 */
type MiddlewaresResults<M extends ComponentMiddleware[]> = {
  [K in M[number] as K["name"]]: NonNullable<
    Awaited<ReturnType<K["run"]>>["next"]
  >;
};

export type BaseComponentContextOptions<M extends ComponentMiddleware[] = ComponentMiddleware[]> = {
  additional?: MiddlewaresResults<M>;
  locale: string;
};
/**
 * Base Component context
 */
export class BaseComponentContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  InGuild extends true | false = true | false,
> extends InteractionContext<InGuild> implements Omit<ContextDocs, "command" | "resolvedCommandName"> {
  /**
   * The custom id of the component
   */
  customId: string;

  interaction: MessageComponentInteraction | ModalSubmitInteraction;

  /**
   * If interaction already deferred
   */
  defer: boolean = false;

  /**
   * If interaction already has a reply
   */
  hasReply: boolean = false;

  /**
   * Additional middleware results
   */
  additional: MiddlewaresResults<M>;

  /**
   * get a locale text, with language detected self
   */
  t: typeof i18next.t;

  /**
   * Constructor for ComponentContext.
   * @param client The ArcClient instance.
   * @param interaction The interaction object.
   * @param options additional options
   */
  constructor(
    client: ArcClient,
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
    options: BaseComponentContextOptions<M>,
  ) {
    super(client, interaction);
    this.customId = interaction.customId;
    this.interaction = interaction;

    this.additional = options.additional || ({} as MiddlewaresResults<M>);

    if (this.client.localeManager.enabled) {
      this.t = this.client.localeManager.i18n.getFixedT(options.locale);
    }
    else {
      this.t = this.client.localeManager.t;
    }
  }

  /**
   * Responds to the interaction by sending a reply message.
   * @param message The reply message or options.
   * @param options Optional additional reply options.
   * @returns The result of the reply operation.
   */
  async reply(
    message: string,
    options?: Omit<InteractionReplyOptions, "content">
  ): Promise<ComponentRunResult>;

  /**
   * Responds to the interaction by sending a reply message.
   * @param options Reply options.
   * @returns The result of the reply operation.
   */
  async reply(
    options: MessagePayload | InteractionReplyOptions
  ): Promise<ComponentRunResult>;

  async reply(
    message: string | MessagePayload | InteractionReplyOptions,
    options?: Omit<InteractionReplyOptions, "content">,
  ): Promise<ComponentRunResult> {
    try {
      if (options && typeof message === "string") {
        message = { ...options, content: message };
      }

      await this.interaction.reply(message);
      this.hasReply = true;
      return ok(true);
    }
    catch (e) {
      return error(
        new ComponentError({
          interaction: this.interaction,
          message: `failed to reply to interaction : ${anyToError(e).message}`,
          originalError: anyToError(e),
        }),
      );
    }
  }

  /**
   * Edits an existing reply message in the interaction.
   * @param message The new message content or options.
   * @param options Optional additional edit reply options.
   * @returns The result of the edit operation.
   */
  async editReply(
    message: string,
    options?: Omit<InteractionEditReplyOptions, "content">
  ): Promise<ComponentRunResult>;

  /**
   * Edits an existing reply message in the interaction.
   * @param options Edit reply options.
   * @returns The result of the edit operation.
   */
  async editReply(
    options: MessagePayload | InteractionEditReplyOptions
  ): Promise<ComponentRunResult>;

  async editReply(
    message: string | MessagePayload | InteractionEditReplyOptions,
    options?: Omit<InteractionReplyOptions, "content">,
  ): Promise<ComponentRunResult> {
    try {
      if (options && typeof message === "string") {
        message = { ...options, content: message };
      }

      await this.interaction.editReply(message);
      this.hasReply = true;
      return ok(true);
    }
    catch (e) {
      return error(
        new ComponentError({
          interaction: this.interaction,
          message: `failed to edit reply to interaction : ${anyToError(e).message}`,
          originalError: anyToError(e),
        }),
      );
    }
  }

  /**
   * Defers the reply to the interaction.
   * @param options The defer reply options.
   * @returns The result of the defer operation.
   */
  async deferReply(
    options: InteractionDeferReplyOptions,
  ): Promise<ComponentRunResult> {
    try {
      await this.interaction.deferReply(options);
      this.defer = true;
      return ok(true);
    }
    catch (e) {
      return error(
        new ComponentError({
          interaction: this.interaction,
          message: `failed to defer reply to interaction : ${anyToError(e).message}}`,
          originalError: anyToError(e),
        }),
      );
    }
  }

  /**
   * Wraps a value with a success status.
   * @param value The value to be wrapped.
   * @returns The result object with success status.
   */
  ok(value: string | true = true): ComponentRunResult {
    return ok(value);
  }

  /**
   * Creates an error result.
   * @param options The error options.
   * @returns The error result.
   */
  error(
    options: Omit<ComponentErrorOptions, "interaction">,
  ): ComponentRunResult {
    return error(
      new ComponentError({ ...options, interaction: this.interaction }),
    );
  }

  /**
   * Runs multiple functions sequentially and stops on the first error.
   * @param funcList The list of functions to run.
   * @returns The result of the multiple operations.
   */
  async multiple(
    ...funcList: Promise<ComponentRunResult>[]
  ): Promise<ComponentRunResult> {
    for (const func of funcList) {
      const [err] = await func;

      if (err) {
        return error(err);
      }
    }

    return ok(true);
  }

  /**
   * Checks if the current context is a button context.
   * @returns True if it is a button context, false otherwise.
   */
  isButtonContext(): this is ButtonContext {
    return false;
  }

  /**
   * Checks if the current context is a modal context.
   * @returns True if it is a modal context, false otherwise.
   */
  isModalContext(): this is ModalContext {
    return false;
  }

  /**
   * Checks if the current context is a string select menu context.
   * @returns True if it is a string select menu context, false otherwise.
   */
  isStringSelectMenuContext(): this is StringSelectMenuContext {
    return false;
  }

  /**
   * Checks if the current context is a user select menu context.
   * @returns True if it is a user select menu context, false otherwise.
   */
  isUserSelectMenuContext(): this is UserSelectMenuContext {
    return false;
  }

  /**
   * Checks if the current context is a role select menu context.
   * @returns True if it is a role select menu context, false otherwise.
   */
  isRoleSelectMenuContext(): this is RoleSelectMenuContext {
    return false;
  }

  /**
   * Checks if the current context is a mentionable select menu context.
   * @returns True if it is a mentionable select menu context, false otherwise.
   */
  isMentionableSelectMenuContext(): this is MentionableSelectMenuContext {
    return false;
  }

  /**
   * Checks if the current context is a channel select menu context.
   * @returns True if it is a channel select menu context, false otherwise.
   */
  isChannelSelectMenuContext(): this is ChannelSelectMenuContext {
    return false;
  }

  /**
   * Checks if the current context is a select menu context.
   * @returns True if it is a select menu context, false otherwise.
   */
  isSelectMenuContext(): this is SelectMenuContext {
    return false;
  }

  /**
   * Checks if the current context is a message component context.
   * @returns True if it is a message component context, false otherwise.
   */
  isMessageComponentContext(): this is MessageComponentContext {
    return false;
  }
}
