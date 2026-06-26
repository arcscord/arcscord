import type {
  APIChannel,
  APIRole,
  Channel,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  Role,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  User,
  UserSelectMenuInteraction,
} from "discord.js";
import type { ArcClient, BaseComponentContextOptions } from "#/base";
import type { StringSelectMenuValues, TypedSelectMenuOptions } from "#/base/components";
import type { ComponentMiddleware } from "#/base/components/interaction/component_middleware";
import { MessageComponentContext } from "#/base/components/interaction/context/message_component_context";

/**
 * Base context for select menu interactions.
 */
export class SelectMenuContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> extends MessageComponentContext<M, Route> {
  isSelectMenuContext(): this is SelectMenuContext<M, Route> {
    return true;
  }
}

/**
 * Options for the StringSelectMenuContext.
 */
export type StringSelectMenuContextOptions<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  T extends TypedSelectMenuOptions | undefined = undefined,
  Route extends string = string,
  MaxValues extends number | undefined = number | undefined,
> = BaseComponentContextOptions<M, Route> & {
  values: T extends TypedSelectMenuOptions
    ? StringSelectMenuValues<T, MaxValues>
    : string[];
};

/**
 * Context for string select menu interactions.
 */
export class StringSelectMenuContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  T extends TypedSelectMenuOptions | undefined = undefined,
  Route extends string = string,
  MaxValues extends number | undefined = number | undefined,
> extends SelectMenuContext<M, Route> {
  values: T extends TypedSelectMenuOptions
    ? StringSelectMenuValues<T, MaxValues>
    : string[];

  interaction: StringSelectMenuInteraction;

  constructor(
    client: ArcClient,
    interaction: StringSelectMenuInteraction,
    options: StringSelectMenuContextOptions<M, T, Route, MaxValues>,
  ) {
    super(client, interaction, options);
    this.values = options.values;
    this.interaction = interaction;
  }

  isStringSelectMenuContext(): this is StringSelectMenuContext<M, T, Route> {
    return true;
  }
}

/**
 * Options for the UserSelectMenuContext.
 */
export type UserSelectMenuContextOptions<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentContextOptions<M, Route> & {
  values: User[];
};

/**
 * Context for user select menu interactions.
 */
export class UserSelectMenuContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> extends SelectMenuContext<M, Route> {
  values: User[];
  interaction: UserSelectMenuInteraction;

  constructor(
    client: ArcClient,
    interaction: UserSelectMenuInteraction,
    options: UserSelectMenuContextOptions<M, Route>,
  ) {
    super(client, interaction, options);
    this.values = options.values;
    this.interaction = interaction;
  }

  isUserSelectMenuContext(): this is UserSelectMenuContext<M, Route> {
    return true;
  }
}

/**
 * Options for the RoleSelectMenuContext.
 */
export type RoleSelectMenuContextOptions<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentContextOptions<M, Route> & {
  values: (Role | APIRole)[];
};

/**
 * Context for role select menu interactions.
 */
export class RoleSelectMenuContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> extends SelectMenuContext<M, Route> {
  values: (Role | APIRole)[];
  interaction: RoleSelectMenuInteraction;

  constructor(
    client: ArcClient,
    interaction: RoleSelectMenuInteraction,
    options: RoleSelectMenuContextOptions<M, Route>,
  ) {
    super(client, interaction, options);
    this.values = options.values;
    this.interaction = interaction;
  }

  isRoleSelectMenuContext(): this is RoleSelectMenuContext<M, Route> {
    return true;
  }
}

/**
 * Options for the MentionableSelectMenuContext.
 */
export type MentionableSelectMenuContextOptions<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentContextOptions<M, Route> & {
  roles: (Role | APIRole)[];
  users: User[];
};

/**
 * Context for mentionable select menu interactions.
 */
export class MentionableSelectMenuContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> extends SelectMenuContext<M, Route> {
  values: (Role | User | APIRole)[];
  roles: (Role | APIRole)[];
  users: User[];
  interaction: MentionableSelectMenuInteraction;

  constructor(
    client: ArcClient,
    interaction: MentionableSelectMenuInteraction,
    options: MentionableSelectMenuContextOptions<M, Route>,
  ) {
    super(client, interaction, options);
    this.interaction = interaction;
    this.roles = options.roles;
    this.users = options.users;
    this.values = [...options.roles, ...options.users];
  }

  isMentionableSelectMenuContext(): this is MentionableSelectMenuContext<M, Route> {
    return true;
  }
}

/**
 * Options for the ChannelSelectMenuContext.
 */
export type ChannelSelectMenuContextOptions<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentContextOptions<M, Route> & {
  values: (Channel | APIChannel)[];
};

/**
 * Context for channel select menu interactions.
 */
export class ChannelSelectMenuContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> extends SelectMenuContext<M, Route> {
  values: (Channel | APIChannel)[];
  interaction: ChannelSelectMenuInteraction;

  constructor(
    client: ArcClient,
    interaction: ChannelSelectMenuInteraction,
    options: ChannelSelectMenuContextOptions<M, Route>,
  ) {
    super(client, interaction, options);
    this.values = options.values;
    this.interaction = interaction;
  }

  isChannelSelectMenuContext(): this is ChannelSelectMenuContext<M, Route> {
    return true;
  }
}
