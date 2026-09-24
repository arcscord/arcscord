import type {
  ButtonContext,
  ChannelSelectMenuContext,
  MentionableSelectMenuContext,
  ModalContext,
  RoleSelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "#/base";
import type { ComponentMiddleware } from "#/base/components/interaction/component_middleware";
import type { RouteVariablesObject } from "#/base/components/interaction/route";
import type { TypedSelectMenuOptions } from "#/base/components/shared/component_definer.type";

export * from "./base_context";
export * from "./button_context";
export * from "./message_component_context";
export * from "./modal_context";
export * from "./select_menu_context";

// TypeScript 5.4 requires an interface method for this `this`-based predicate.
// eslint-disable-next-line ts/consistent-type-definitions
interface ComponentParamAccess<Route extends string> {
  /** Returns a decoded route parameter when it is available. */
  getParam: (name: string) => string | undefined;

  /**
   * Checks for a decoded route parameter and narrows `ctx.params` when present.
   */
  // eslint-disable-next-line ts/method-signature-style
  hasParam<Name extends string>(
    name: Name,
  ): this is ComponentContext<Route> & {
    params: RouteVariablesObject<Route> & Record<Name, string>;
  };
}

/**
 * Union of every component context (button, modal, and the select-menu variants)
 * a component handler may receive, parameterized by its `Route`.
 *
 * @typeParam Route - The component's route pattern used to type its dynamic params.
 */
export type ComponentContext<Route extends string = string>
  = ((
    | ButtonContext<ComponentMiddleware[], Route>
    | ModalContext<ComponentMiddleware[], Route>
    | StringSelectMenuContext<ComponentMiddleware[], undefined, Route>
    | StringSelectMenuContext<ComponentMiddleware[], TypedSelectMenuOptions, Route, number | undefined>
    | UserSelectMenuContext<ComponentMiddleware[], Route>
    | MentionableSelectMenuContext<ComponentMiddleware[], Route>
    | RoleSelectMenuContext<ComponentMiddleware[], Route>
    | ChannelSelectMenuContext<ComponentMiddleware[], Route>
  ) extends infer Context
    ? Context extends unknown
      ? Omit<Context, "getParam" | "hasParam">
      : never
    : never)
  & ComponentParamAccess<Route>;
