import type { ActionRowData, StringSelectMenuComponentData } from "discord.js";
import type { ComponentRunResult } from "#/base/components/interaction/component.type";
import type {
  ButtonComponentHandler,
  ChannelSelectMenuComponentHandler,
  ComponentBuildArgs,
  ComponentBuilderOptions,
  IdInitialiseFunction,
  MentionableSelectMenuComponentHandler,
  ModalComponentBuilderOptions,
  ModalComponentHandler,
  RoleSelectMenuComponentHandler,
  SelectMenuComponentHandler,
  StringSelectMenuComponentHandler,
  UserSelectMenuComponentHandler,
} from "#/base/components/interaction/component_handlers.type";
import type { ComponentMiddleware } from "#/base/components/interaction/component_middleware";
import type { StringSelectMenuContext } from "#/base/components/interaction/context/select_menu_context";
import type { RouteVariablesObject } from "#/base/components/interaction/route";
import type {
  ModalFields,
  StringSelectMenu,
  TypedSelectMenuOptions,
} from "#/base/components/shared/component_definer.type";
import type { PreReplyMode } from "#/utils/type/pre_reply.type";
import { ComponentType } from "discord-api-types/v10";
import { createRouteId, hasComponentRouteParams } from "#/base/components/interaction/route";
import { withModalFieldIds } from "#/base/components/modal/builders";
import { stringSelectMenu } from "#/base/components/shared/builders";
import { componentHandlerTypeEnum } from "#/base/components/shared/component.enum";

type HandlerOptions<T> = T extends unknown ? Omit<T, "handlerType"> : never;

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
  /**
   * The fixed option set. Must be a static `as const` object literal — its
   * keys are captured once, at creation time (not lazily inside `build()`),
   * so the allowed set is known even before the first `build()` call.
   */
  values: Values;
  maxValues?: MaxValues;
  minValues?: number;
  build: (
    id: IdInitialiseFunction,
    ...args: Options
  ) => Omit<StringSelectMenu<"message">, "maxValues" | "minValues" | "options" | "type">;
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
 *   build: id => userSelectMenu({
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
 *
 * > **Warning:** `values` **must** be a static object literal asserted with
 * > `as const`. Its keys define both the `ctx.values` type and the set of
 * > values accepted at runtime — selections outside that set (e.g. from an
 * > outdated message) are rejected. Building `values` dynamically (or omitting
 * > `as const`) collapses `ctx.values` back to `string` and voids the type
 * > safety this helper provides.
 *
 * @param options - The properties to configure the typed string select menu
 * @returns The complete set of properties for the typed string select menu
 * @example
 * ```ts
 * const typedStringSelectMenu = createTypedStringMenu({
 *   route: "typed_string_select",
 *   values: {
 *     fun: {
 *       label: "Fun",
 *       description: "A fun option",
 *     },
 *     happy: {
 *       label: "Happy",
 *       description: "A happy option",
 *     },
 *   },
 *   maxValues: 2,
 *   build: id => ({
 *     customId: id(),
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
  // `values`/`maxValues` are static (required to be an `as const` literal), so
  // they're captured immediately here instead of waiting for `build()` to
  // run. This means the allowed set is known the instant the handler is
  // created — including right after a restart, before any message using it
  // has been rebuilt — so ComponentManager can always validate incoming
  // values correctly.
  const typedAllowedValues = new Set(Object.keys(options.values));
  const typedSingleValue = options.maxValues === 1;
  const handler = {
    ...options,
    build: (...args: ComponentBuildArgs<Route, Options>): ActionRowData<StringSelectMenuComponentData> => {
      const [buildId, buildArgs] = resolveRouteBuild(...args);
      const menu = options.build(buildId, ...buildArgs);
      return stringSelectMenu({
        ...menu,
        options: options.values,
        maxValues: options.maxValues,
        minValues: options.minValues,
      });
    },
    handlerType: componentHandlerTypeEnum.messageComponent,
    typedSingleValue,
    typedAllowedValues,
    type: ComponentType.StringSelect,
  };
  return handler as unknown as StringSelectMenuComponentHandler<
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
 *   build: id => button({
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
 *   fields: {
 *     entry: modalTextInput({
 *       label: "Entry",
 *       style: "short",
 *     }),
 *   },
 *   build: (id, fields) => buildModal({
 *     title: "Famous modal",
 *     customId: id(),
 *     components: [fields.entry.label()],
 *   }),
 *   run: (ctx) => {
 *     return ctx.reply(`You reply with ${ctx.values.entry || "nothing"}`);
 *   },
 * });
 * ```
 *
 */
export function createModal<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = [],
  Route extends string = string,
  const Fields extends ModalFields = ModalFields,
>(options: Omit<ModalComponentBuilderOptions<ModalComponentHandler<Options, Middleware, Route, Fields>, Options, Fields>, "handlerType">): ModalComponentHandler<Options, Middleware, Route, Fields>;
export function createModal<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = [],
  Route extends string = string,
>(options: Omit<ComponentBuilderOptions<ModalComponentHandler<Options, Middleware, Route, undefined>, Options>, "fields" | "handlerType">): ModalComponentHandler<Options, Middleware, Route, undefined>;
export function createModal<
  Options extends string[],
  Middleware extends ComponentMiddleware[] = [],
  Route extends string = string,
  const Fields extends ModalFields = ModalFields,
>(
  options:
    | Omit<ModalComponentBuilderOptions<ModalComponentHandler<Options, Middleware, Route, Fields>, Options, Fields>, "handlerType">
    | Omit<ComponentBuilderOptions<ModalComponentHandler<Options, Middleware, Route, undefined>, Options>, "fields" | "handlerType">,
): ModalComponentHandler<Options, Middleware, Route, Fields | undefined> {
  const resolveRouteBuild = createRouteBuildResolver<Route, Options>(options.route);
  const fields = "fields" in options ? withModalFieldIds(options.fields) : undefined;
  return {
    ...options,
    fields,
    build: (...args: ComponentBuildArgs<Route, Options>) => {
      const [buildId, buildArgs] = resolveRouteBuild(...args);
      if (fields) {
        return (
          options as ModalComponentBuilderOptions<ModalComponentHandler<Options, Middleware, Route, Fields>, Options, Fields>
        ).build(buildId, fields, ...buildArgs);
      }

      return (
        options as ComponentBuilderOptions<ModalComponentHandler<Options, Middleware, Route, undefined>, Options>
      ).build(buildId, ...buildArgs);
    },
    handlerType: componentHandlerTypeEnum.modal,
  } as ModalComponentHandler<Options, Middleware, Route, Fields | undefined>;
}
