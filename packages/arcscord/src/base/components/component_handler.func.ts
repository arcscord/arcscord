import type { ActionRowData, StringSelectMenuComponentData } from "discord.js";
import type { ComponentRunResult } from "#/base/components/component.type";
import type {
  StringSelectMenu,
  TypedSelectMenuOptions,
} from "#/base/components/component_definer.type";
import type {
  ButtonComponentHandler,
  ChannelSelectMenuComponentHandler,
  ComponentBuildArgs,
  IdInitialiseFunction,
  MentionableSelectMenuComponentHandler,
  ModalComponentHandler,
  RoleSelectMenuComponentHandler,
  SelectMenuComponentHandler,
  StringSelectMenuComponentHandler,
  TypedStringSelectSnapshot,
  UserSelectMenuComponentHandler,
} from "#/base/components/component_handlers.type";
import type { ComponentMiddleware } from "#/base/components/component_middleware";
import type { StringSelectMenuContext } from "#/base/components/context/select_menu_context";
import type { RouteVariablesObject } from "#/base/components/route";
import type { PreReplyMode } from "#/utils/type/pre_reply.type";
import { ComponentType } from "discord-api-types/v10";
import { buildStringSelectMenu } from "#/base/components/build_component.func";
import { componentHandlerTypeEnum } from "#/base/components/component.enum";
import { createRouteId, hasComponentRouteParams } from "#/base/components/route";

type HandlerOptions<T> = T extends unknown ? Omit<T, "handlerType"> : never;

type ComponentBuilderOptions<
  Handler extends { build: (...args: any[]) => unknown },
  Options extends string[],
> = Omit<Handler, "build"> & {
  build: (id: IdInitialiseFunction, ...args: Options) => ReturnType<Handler["build"]>;
};

function createRouteBuildResolver<Route extends string, Options extends string[]>(
  route: Route,
): (...args: ComponentBuildArgs<Route, Options>) => [IdInitialiseFunction, Options] {
  const routeHasParams = hasComponentRouteParams(route);
  const staticBuildId = routeHasParams ? undefined : createRouteId(route);

  return (...args: ComponentBuildArgs<Route, Options>) => {
    if (!routeHasParams) {
      return [staticBuildId as IdInitialiseFunction, args as Options];
    }

    const [params, ...buildArgs] = args as [RouteVariablesObject<Route>, ...Options];
    return [createRouteId(route, params), buildArgs as Options];
  };
}

type TypedStringMenuOptions<
  Options extends string[],
  Middleware extends ComponentMiddleware[],
  Route extends string,
  Values extends TypedSelectMenuOptions,
  MaxValues extends number | undefined,
> = {
  route: Route;
  preReply?: PreReplyMode;
  use?: Middleware;
  build: (
    id: IdInitialiseFunction,
    ...args: Options
  ) => Omit<StringSelectMenu<"message">, "maxValues" | "options" | "type"> & {
    values: Values;
    maxValues?: MaxValues;
  };
  run: (
    ctx: StringSelectMenuContext<
      Middleware,
      NoInfer<Values>,
      Route,
      NoInfer<MaxValues>
    >,
  ) => Promise<ComponentRunResult>;
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
>(options: HandlerOptions<ComponentBuilderOptions<StringSelectMenuComponentHandler<Options, Middleware, Route>, Options>>): StringSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<UserSelectMenuComponentHandler<Options, Middleware, Route>, Options>>): UserSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<RoleSelectMenuComponentHandler<Options, Middleware, Route>, Options>>): RoleSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<MentionableSelectMenuComponentHandler<Options, Middleware, Route>, Options>>): MentionableSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<ChannelSelectMenuComponentHandler<Options, Middleware, Route>, Options>>): ChannelSelectMenuComponentHandler<Options, Middleware, Route>;
export function createSelectMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
>(options: HandlerOptions<ComponentBuilderOptions<SelectMenuComponentHandler<Options, Middleware, Route>, Options>>): SelectMenuComponentHandler<Options, Middleware, Route> {
  const resolveRouteBuild = createRouteBuildResolver<Route, Options>(options.route);
  return {
    ...options,
    build: (...args: ComponentBuildArgs<Route, Options>) => {
      const [buildId, buildArgs] = resolveRouteBuild(...args);
      return options.build(buildId, ...buildArgs);
    },
    handlerType: componentHandlerTypeEnum.messageComponent,
  } as SelectMenuComponentHandler<Options, Middleware, Route>;
}

/**
 * Create a typed string select menu.
 *
 * The selected values are inferred from the keys of `values`.
 * When `maxValues` is `1`, `ctx.values` is typed and returned as a single value.
 * @param options - The properties to configure the typed string select menu
 * @returns The complete set of properties for the typed string select menu
 * @example
 * ```ts
 * const typedStringSelectMenu = createTypedStringMenu({
 *   route: "typed_string_select",
 *   build: id => ({
 *     customId: id(),
 *     values: {
 *       fun: {
 *         label: "Fun",
 *         description: "A fun option",
 *       },
 *       happy: {
 *         label: "Happy",
 *         description: "A happy option",
 *       },
 *     },
 *     maxValues: 2,
 *   }),
 *   run: (ctx) => {
 *     const selectedValues: Array<keyof typeof typedStringSelectValues> = ctx.values;
 *
 *     return ctx.reply(`Selected typed values ${selectedValues.join(", ")} !`);
 *   },
 * });
 * ```
 */
export function createTypedStringMenu<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
  const Values extends TypedSelectMenuOptions = TypedSelectMenuOptions,
  const MaxValues extends number | undefined = number | undefined,
>(
  options: TypedStringMenuOptions<Options, Middleware, Route, Values, MaxValues>,
): StringSelectMenuComponentHandler<Options, Middleware, Route, Values, MaxValues> {
  const resolveRouteBuild = createRouteBuildResolver<Route, Options>(options.route);
  const typedStringSelectSnapshots = new Map<
    string,
    TypedStringSelectSnapshot<Values, MaxValues>
  >();
  return {
    ...options,
    build: (...args: ComponentBuildArgs<Route, Options>): ActionRowData<StringSelectMenuComponentData> => {
      const [buildId, buildArgs] = resolveRouteBuild(...args);
      const menu = options.build(buildId, ...buildArgs);
      typedStringSelectSnapshots.set(menu.customId, {
        values: menu.values,
        maxValues: menu.maxValues,
      });
      return buildStringSelectMenu({
        ...menu,
        options: menu.values,
      });
    },
    handlerType: componentHandlerTypeEnum.messageComponent,
    typedStringSelectSnapshots,
    type: ComponentType.StringSelect,
  } as unknown as StringSelectMenuComponentHandler<
    Options,
    Middleware,
    Route,
    Values,
    MaxValues
  >;
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
>(options: Omit<ComponentBuilderOptions<ButtonComponentHandler<Options, Middleware, Route>, Options>, "type" | "handlerType">): ButtonComponentHandler<Options, Middleware, Route> {
  const resolveRouteBuild = createRouteBuildResolver<Route, Options>(options.route);
  return {
    ...options,
    build: (...args: ComponentBuildArgs<Route, Options>) => {
      const [buildId, buildArgs] = resolveRouteBuild(...args);
      return options.build(buildId, ...buildArgs);
    },
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
>(options: Omit<ComponentBuilderOptions<ModalComponentHandler<Options, Middleware, Route>, Options>, "handlerType">): ModalComponentHandler<Options, Middleware, Route> {
  const resolveRouteBuild = createRouteBuildResolver<Route, Options>(options.route);
  return {
    ...options,
    build: (...args: ComponentBuildArgs<Route, Options>) => {
      const [buildId, buildArgs] = resolveRouteBuild(...args);
      return options.build(buildId, ...buildArgs);
    },
    handlerType: componentHandlerTypeEnum.modal,
  };
}
