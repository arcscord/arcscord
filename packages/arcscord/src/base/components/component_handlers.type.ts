import type { ComponentType } from "discord-api-types/v10";
import type {
  ActionRowData,
  ChannelSelectMenuComponentData,
  MentionableSelectMenuComponentData,
  ModalComponentData,
  RoleSelectMenuComponentData,
  StringSelectMenuComponentData,
  UserSelectMenuComponentData,
} from "discord.js";
import type { componentHandlerTypeEnum } from "#/base/components/component.enum";
import type { ComponentRunResult } from "#/base/components/component.type";
import type { Button, MessageComponentType, TypedSelectMenuOptions } from "#/base/components/component_definer.type";
import type { ComponentMiddleware } from "#/base/components/component_middleware";
import type { ButtonContext } from "#/base/components/context/button_context";
import type { ModalContext } from "#/base/components/context/modal_context";
import type {
  ChannelSelectMenuContext,
  MentionableSelectMenuContext,
  RoleSelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "#/base/components/context/select_menu_context";

export type RouteComponentHandle<Route extends string> = {
  /**
   * The route of the component.
   *
   * Static segments accept a-z, A-Z, 0-9, `_` and `-`.
   * Dynamic segments use `{variableName}` and are encoded in custom IDs with
   * a `$` prefix.
   *
   * max length : 100
   * @example
   * route : "user/info/{userId}/{action}"
   * matches customId like "user/info/$123456/$view" and extract userId = 123456 and action = view
   */
  route: Route;
};

export type RouteVariables<T extends string>
  = T extends `${string}/{${infer Var}}/${infer Rest}` ? Var | RouteVariables<`/${Rest}`>
    : T extends `${string}/{${infer Var}}` ? Var
      : never;

export type RouteVariablesObject<T extends string> = {
  [K in RouteVariables<T>]: string;
};

export type IdInitialiseFunction<T extends string> = T extends `${string}/{${string}}${string}` ? (options: RouteVariablesObject<T>) => string : () => string;
/**
 * Base properties for all component types.
 */
export type BaseComponentHandler<
  Middlewares extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = {

  /**
   * Whether to pre-reply.
   */
  preReply?: boolean;

  /**
   * Whether the pre-reply should be ephemeral.
   */
  ephemeralPreReply?: boolean;

  use?: Middlewares;
} & RouteComponentHandle<Route>;

/**
 * Base properties for message component handlers.
 */
export type BaseMessageComponentHandler<Middlewares extends ComponentMiddleware[] = ComponentMiddleware[]> = BaseComponentHandler<Middlewares> & {
  /**
   * The Discord message component type.
   */
  type: MessageComponentType;

  /**
   * The Discord interaction family handled by this handler.
   */
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
};

/**
 * Base properties for modal submit handlers.
 */
export type BaseModalSubmitHandler<Middlewares extends ComponentMiddleware[] = ComponentMiddleware[]> = BaseComponentHandler<Middlewares> & {
  /**
   * The Discord interaction family handled by this handler.
   */
  handlerType: typeof componentHandlerTypeEnum.modal;
};

/**
 * Properties for a button component.
 */
export type ButtonComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
  type: ComponentType.Button;

  /**
   * Function to build the button.
   */
  build: (...args: Options) => Button;

  /**
   * Function to run when the button is clicked.
   */
  run: (ctx: ButtonContext<Middleware, Route>) => Promise<ComponentRunResult>;
};

/**
 * Properties for a string select menu component.
 */
export type StringSelectMenuComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
  Typed extends TypedSelectMenuOptions | undefined = undefined,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
  type: ComponentType.StringSelect;

  /**
   * Function to build the string select menu.
   */
  build: (...args: Options) => ActionRowData<StringSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: StringSelectMenuContext<Middleware, Typed, Route>) => Promise<ComponentRunResult>;
} & (Typed extends TypedSelectMenuOptions ? { values: Typed } : NonNullable<unknown>);

/**
 * Properties for a user select menu component.
 */
export type UserSelectMenuComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
  type: ComponentType.UserSelect;

  /**
   * Function to build the user select menu.
   */
  build: (...args: Options) => ActionRowData<UserSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: UserSelectMenuContext<Middleware, Route>) => Promise<ComponentRunResult>;
};

/**
 * Properties for a role select menu component.
 */
export type RoleSelectMenuComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
  type: ComponentType.RoleSelect;

  /**
   * Function to build the role select menu.
   */
  build: (...args: Options) => ActionRowData<RoleSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: RoleSelectMenuContext<Middleware, Route>) => Promise<ComponentRunResult>;
};

/**
 * Properties for a mentionable select menu component.
 */
export type MentionableSelectMenuComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
  type: ComponentType.MentionableSelect;

  /**
   * Function to build the mentionable select menu.
   */
  build: (...args: Options) => ActionRowData<MentionableSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: MentionableSelectMenuContext<Middleware, Route>) => Promise<ComponentRunResult>;
};

/**
 * Properties for a channel select menu component.
 */
export type ChannelSelectMenuComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
  type: ComponentType.ChannelSelect;

  /**
   * Function to build the channel select menu.
   */
  build: (...args: Options) => ActionRowData<ChannelSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: ChannelSelectMenuContext<Middleware, Route>) => Promise<ComponentRunResult>;
};

/**
 * Properties for a modal component.
 */
export type ModalComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType: typeof componentHandlerTypeEnum.modal;

  /**
   * Function to build the modal.
   */
  build: (...args: Options) => ModalComponentData;

  /**
   * Function to run when the modal is submitted.
   */
  run: (ctx: ModalContext<Middleware, Route>) => Promise<ComponentRunResult>;
};

/**
 * Properties for a select menu component.
 */
export type SelectMenuComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = StringSelectMenuComponentHandler<Options, Middleware, Route>
  | UserSelectMenuComponentHandler<Options, Middleware, Route>
  | RoleSelectMenuComponentHandler<Options, Middleware, Route>
  | MentionableSelectMenuComponentHandler<Options, Middleware, Route>
  | ChannelSelectMenuComponentHandler<Options, Middleware, Route>;

/**
 * Union type for all component properties.
 */
export type ComponentHandler
  = | ButtonComponentHandler
    | SelectMenuComponentHandler
    | ModalComponentHandler;
