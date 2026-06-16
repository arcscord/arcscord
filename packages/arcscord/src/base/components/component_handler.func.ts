import type {
  ButtonComponentHandler,
  ChannelSelectMenuComponentHandler,
  IdInitialiseFunction,
  MentionableSelectMenuComponentHandler,
  ModalComponentHandler,
  RoleSelectMenuComponentHandler,
  SelectMenuComponentHandler,
  StringSelectMenuComponentHandler,
  UserSelectMenuComponentHandler,
} from "#/base/components/component_handlers.type";
import type { ComponentMiddleware } from "#/base/components/component_middleware";
import { ComponentType } from "discord-api-types/v10";
import { componentHandlerTypeEnum } from "#/base/components/component.enum";
import { createRouteId } from "#/base/components/component_route.util";

type HandlerOptions<T> = T extends unknown ? Omit<T, "handlerType"> : never;

type ComponentBuilderOptions<
  Handler extends { build: (...args: any[]) => unknown },
  Options extends string[],
  Route extends string,
> = Omit<Handler, "build"> & {
  build: (id: IdInitialiseFunction<Route>, ...args: Options) => ReturnType<Handler["build"]>;
};

/**
 * Create a select menu
 *
 * @param  options - the properties to configure the select menu
 * @returns  The complete set of properties for the select menu
 * @example
 * ```ts
 * const selectMenu = createSelectMenu({
 *   type: "userSelect",
 *   route: "selectMenu",
 *   build: id => buildUserSelectMenu({
 *     customId: id(),
 *     maxValues: 10,
 *     minValues: 1,
 *   }),
 *   run: (ctx) => {
 *     return ctx.reply(`You select ${ctx.values.length} users`);
 *   },
 * });
 * ```
 */
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<StringSelectMenuComponentHandler<Options, Middleware, Route>, Options, Route>>): StringSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<UserSelectMenuComponentHandler<Options, Middleware, Route>, Options, Route>>): UserSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<RoleSelectMenuComponentHandler<Options, Middleware, Route>, Options, Route>>): RoleSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<MentionableSelectMenuComponentHandler<Options, Middleware, Route>, Options, Route>>): MentionableSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<ChannelSelectMenuComponentHandler<Options, Middleware, Route>, Options, Route>>): ChannelSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<SelectMenuComponentHandler<Options, Middleware, Route>, Options, Route>>): SelectMenuComponentHandler<Options, Middleware, Route> {
  const buildId = createRouteId(options.route);
  return {
    ...options,
    build: (...args: Options) => options.build(buildId, ...args),
    handlerType: componentHandlerTypeEnum.messageComponent,
  } as SelectMenuComponentHandler<Options, Middleware, Route>;
}

/**
 * create a button
 *
 * @param options - The properties to configure the modal
 * @returns the complete set of properties for the button
 * @example
 * ```ts
 * const button = createButton({
 *   route: "button",
 *   build: id => buildClickableButton({
 *     style: "success",
 *     customId: id(),
 *     label: "Click Here",
 *   }),
 *   run: (ctx) => {
 *     return ctx.reply("You clicked !");
 *   },
 * });
 * ```
 */
export function createButton<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: Omit<ComponentBuilderOptions<ButtonComponentHandler<Options, Middleware, Route>, Options, Route>, "type" | "handlerType">): ButtonComponentHandler<Options, Middleware, Route> {
  const buildId = createRouteId(options.route);
  return {
    ...options,
    build: (...args: Options) => options.build(buildId, ...args),
    type: ComponentType.Button,
    handlerType: componentHandlerTypeEnum.messageComponent,
  };
}

/**
 * Create a modal
 *
 * @param  options - The properties to configure the modal
 * @returns The complete set of properties for the modal
 * @example
 * ```ts
 * const myFamousModal = createModal({
 *   route: "famousModal",
 *   build: (id, title) => buildModal(
 *     title,
 *     id(),
 *     buildLabel({
 *       label: "Entry",
 *       component: buildTextInput({
 *         customId: "entry",
 *         style: "short",
 *       }),
 *     }),
 *   ),
 *   run: (ctx) => {
 *     return ctx.reply(`You reply with ${ctx.values.get("entry") || "nothing"}`);
 *   },
 * });
 * ```
 *
 */
export function createModal<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = [],
  Route extends string = string,
>(options: Omit<ComponentBuilderOptions<ModalComponentHandler<Options, Middleware, Route>, Options, Route>, "handlerType">): ModalComponentHandler<Options, Middleware, Route> {
  const buildId = createRouteId(options.route);
  return {
    ...options,
    build: (...args: Options) => options.build(buildId, ...args),
    handlerType: componentHandlerTypeEnum.modal,
  };
}
