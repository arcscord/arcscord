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
import type { TypedSelectMenuOptions } from "#/base/components/shared/component_definer.type";

export * from "./base_context";
export * from "./button_context";
export * from "./message_component_context";
export * from "./modal_context";
export * from "./select_menu_context";

export type ComponentContext<Route extends string = string>
  = | ButtonContext<ComponentMiddleware[], Route>
    | ModalContext<ComponentMiddleware[], Route>
    | StringSelectMenuContext<ComponentMiddleware[], undefined, Route>
    | StringSelectMenuContext<ComponentMiddleware[], TypedSelectMenuOptions, Route, number | undefined>
    | UserSelectMenuContext<ComponentMiddleware[], Route>
    | MentionableSelectMenuContext<ComponentMiddleware[], Route>
    | RoleSelectMenuContext<ComponentMiddleware[], Route>
    | ChannelSelectMenuContext<ComponentMiddleware[], Route>;
