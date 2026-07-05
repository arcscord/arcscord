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
import type { ComponentRunReturn } from "#/base/components/interaction/component.type";
import type { ComponentMiddleware } from "#/base/components/interaction/component_middleware";
import type { ButtonContext } from "#/base/components/interaction/context/button_context";
import type { ModalContext, ModalContextValue } from "#/base/components/interaction/context/modal_context";
import type {
  ChannelSelectMenuContext,
  MentionableSelectMenuContext,
  RoleSelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "#/base/components/interaction/context/select_menu_context";
import type { componentHandlerTypeEnum } from "#/base/components/shared/component.enum";
import type { Button, MessageComponentType, ModalFields, ModalFieldValues, TypedSelectMenuOptions } from "#/base/components/shared/component_definer.type";
import type { PreReplyMode } from "#/utils/type/pre_reply.type";
import type { MaybePromise } from "#/utils/type/util.type";
import type { ComponentBuildArgs, IdInitialiseFunction } from "./route";

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

export type {
  ComponentBuildArgs,
  IdInitialiseFunction,
  RouteVariables,
  RouteVariablesObject,
} from "./route";

/**
 * Options accepted by component factory functions before route arguments are resolved.
 */
export type ComponentBuilderOptions<
  Handler extends { build: (...args: any[]) => unknown },
  Options extends string[],
> = Omit<Handler, "build"> & {
  build: (id: IdInitialiseFunction, ...args: Options) => ReturnType<Handler["build"]>;
};

/**
 * Options accepted by the typed modal factory before route arguments are resolved.
 */
export type ModalComponentBuilderOptions<
  Handler extends { build: (...args: any[]) => unknown },
  Options extends string[],
  Fields extends ModalFields,
> = Omit<Handler, "build" | "fields"> & {
  fields: Fields;
  build: (id: IdInitialiseFunction, fields: Fields, ...args: Options) => ReturnType<Handler["build"]>;
};

/**
 * Base properties for all component types.
 */
export type BaseComponentHandler<
  Middlewares extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> = {

  /**
   * Whether to defer the interaction before executing middlewares and the component.
   *
   * Use `"ephemeral"` to make the deferred response visible only to the user
   * who triggered the component.
   *
   * @default false
   */
  preReply?: PreReplyMode;

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
  build: (...args: ComponentBuildArgs<Route, Options>) => Button;

  /**
   * Function to run when the button is clicked.
   */
  run: (ctx: ButtonContext<Middleware, Route>) => MaybePromise<ComponentRunReturn>;
};

/**
 * Properties for a string select menu component.
 */
export type StringSelectMenuComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
  Typed extends TypedSelectMenuOptions | undefined = undefined,
  MaxValues extends number | undefined = number | undefined,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
  type: ComponentType.StringSelect;

  /**
   * Function to build the string select menu.
   */
  build: (...args: ComponentBuildArgs<Route, Options>) => ActionRowData<StringSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: StringSelectMenuContext<Middleware, Typed, Route, MaxValues>) => MaybePromise<ComponentRunReturn>;
} & (Typed extends TypedSelectMenuOptions
  ? { typedSingleValue?: boolean; typedAllowedValues?: ReadonlySet<string> }
  : NonNullable<unknown>);

/**
 * Storage-compatible string select handler shape.
 *
 * @internal
 */
export type AnyStringSelectMenuComponentHandler = BaseComponentHandler<ComponentMiddleware[], string> & {
  handlerType?: typeof componentHandlerTypeEnum.messageComponent;
  type: ComponentType.StringSelect;
  build: (...args: any[]) => ActionRowData<StringSelectMenuComponentData>;
  /**
   * Set when the menu was created with `createTypedStringMenu` and
   * `maxValues` is `1`, signalling that `ctx.values` is a single value.
   */
  typedSingleValue?: boolean;
  /**
   * Allowed values captured from the static `values` keys of a
   * `createTypedStringMenu`. Used to reject selections from outdated menus.
   */
  typedAllowedValues?: ReadonlySet<string>;
  run: (ctx: StringSelectMenuContext<ComponentMiddleware[], never, string>) => MaybePromise<ComponentRunReturn>;
};

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
  build: (...args: ComponentBuildArgs<Route, Options>) => ActionRowData<UserSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: UserSelectMenuContext<Middleware, Route>) => MaybePromise<ComponentRunReturn>;
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
  build: (...args: ComponentBuildArgs<Route, Options>) => ActionRowData<RoleSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: RoleSelectMenuContext<Middleware, Route>) => MaybePromise<ComponentRunReturn>;
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
  build: (...args: ComponentBuildArgs<Route, Options>) => ActionRowData<MentionableSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: MentionableSelectMenuContext<Middleware, Route>) => MaybePromise<ComponentRunReturn>;
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
  build: (...args: ComponentBuildArgs<Route, Options>) => ActionRowData<ChannelSelectMenuComponentData>;

  /**
   * Function to run when the select menu is used.
   */
  run: (ctx: ChannelSelectMenuContext<Middleware, Route>) => MaybePromise<ComponentRunReturn>;
};

/**
 * Properties for a modal component.
 */
export type ModalComponentHandler<
  Options extends string[] = string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
  Fields extends ModalFields | undefined = ModalFields | undefined,
> = BaseComponentHandler<Middleware, Route> & {
  handlerType: typeof componentHandlerTypeEnum.modal;
  fields?: Fields;

  /**
   * Function to build the modal.
   */
  build: (...args: ComponentBuildArgs<Route, Options>) => ModalComponentData;

  /**
   * Function to run when the modal is submitted.
   */
  run: (ctx: ModalContext<
    Middleware,
    Route,
    Fields extends ModalFields ? ModalFieldValues<Fields> : Record<string, ModalContextValue>
  >) => MaybePromise<ComponentRunReturn>;
};

/**
 * Storage-compatible modal handler shape.
 *
 * @internal
 */
export type AnyModalComponentHandler = BaseComponentHandler<ComponentMiddleware[], string> & {
  fields?: ModalFields;
  handlerType: typeof componentHandlerTypeEnum.modal;
  build: (...args: any[]) => ModalComponentData;
  run: (ctx: ModalContext<ComponentMiddleware[], string, any>) => MaybePromise<ComponentRunReturn>;
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
  = | ButtonComponentHandler<any[], ComponentMiddleware[], any>
    | AnyStringSelectMenuComponentHandler
    | Exclude<SelectMenuComponentHandler<any[], ComponentMiddleware[], any>, StringSelectMenuComponentHandler<any[], ComponentMiddleware[], any>>
    | AnyModalComponentHandler;
