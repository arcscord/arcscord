import type {
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js";
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
import type { SelectMenuContext } from "#/base/components";
import type { ComponentMiddleware } from "#/base/components/interaction/component_middleware";
import type { RouteVariablesObject } from "#/base/components/interaction/route";
import type { ContextDocs } from "#/base/utils";
import { RepliableInteractionContext } from "#/base/utils";

/**
 * @internal
 */
type MiddlewaresResults<M extends ComponentMiddleware[]> = {
  [K in M[number] as K["name"]]: NonNullable<
    Extract<Awaited<ReturnType<K["run"]>>, { status: "next" }>["value"]
  >;
};

/**
 * Options used to build a {@link BaseComponentContext}: the resolved `locale`,
 * the route `params` extracted from the custom id, and the `additional` data
 * accumulated by the component middlewares.
 *
 * @typeParam M - The list of component middlewares feeding `additional`.
 * @typeParam Route - The component's route pattern used to type `params`.
 */
export type BaseComponentContextOptions<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = {
  additional?: MiddlewaresResults<M>;
  locale: string;
  params?: RouteVariablesObject<Route>;
};
/**
 * Base Component context
 */
export class BaseComponentContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
  InGuild extends true | false = true | false,
> extends RepliableInteractionContext<InGuild> implements Omit<ContextDocs, "command" | "resolvedCommandName"> {
  /**
   * The custom id of the component
   */
  customId: string;

  /**
   * Route parameters extracted from the component custom ID.
   */
  params: RouteVariablesObject<Route>;

  interaction: MessageComponentInteraction | ModalSubmitInteraction;

  /**
   * Additional middleware results
   */
  additional: MiddlewaresResults<M>;

  /**
   * Constructor for ComponentContext.
   * @param client The ArcClient instance.
   * @param interaction The interaction object.
   * @param options additional options
   */
  constructor(
    client: ArcClient,
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
    options: BaseComponentContextOptions<M, Route>,
  ) {
    super(client, interaction, options.locale);
    this.customId = interaction.customId;
    this.params = options.params || ({} as RouteVariablesObject<Route>);
    this.interaction = interaction;

    this.additional = options.additional || ({} as MiddlewaresResults<M>);
  }

  /**
   * Checks if the current context is a button context.
   * @returns True if it is a button context, false otherwise.
   */
  isButtonContext(): this is ButtonContext<M, Route> {
    return false;
  }

  /**
   * Checks if the current context is a modal context.
   * @returns True if it is a modal context, false otherwise.
   */
  isModalContext(): this is ModalContext<M, Route, any> {
    return false;
  }

  /**
   * Checks if the current context is a string select menu context.
   * @returns True if it is a string select menu context, false otherwise.
   */
  isStringSelectMenuContext(): this is StringSelectMenuContext<M, undefined, Route> {
    return false;
  }

  /**
   * Checks if the current context is a user select menu context.
   * @returns True if it is a user select menu context, false otherwise.
   */
  isUserSelectMenuContext(): this is UserSelectMenuContext<M, Route> {
    return false;
  }

  /**
   * Checks if the current context is a role select menu context.
   * @returns True if it is a role select menu context, false otherwise.
   */
  isRoleSelectMenuContext(): this is RoleSelectMenuContext<M, Route> {
    return false;
  }

  /**
   * Checks if the current context is a mentionable select menu context.
   * @returns True if it is a mentionable select menu context, false otherwise.
   */
  isMentionableSelectMenuContext(): this is MentionableSelectMenuContext<M, Route> {
    return false;
  }

  /**
   * Checks if the current context is a channel select menu context.
   * @returns True if it is a channel select menu context, false otherwise.
   */
  isChannelSelectMenuContext(): this is ChannelSelectMenuContext<M, Route> {
    return false;
  }

  /**
   * Checks if the current context is a select menu context.
   * @returns True if it is a select menu context, false otherwise.
   */
  isSelectMenuContext(): this is SelectMenuContext<M, Route> {
    return false;
  }

  /**
   * Checks if the current context is a message component context.
   * @returns True if it is a message component context, false otherwise.
   */
  isMessageComponentContext(): this is MessageComponentContext<M, Route> {
    return false;
  }
}
