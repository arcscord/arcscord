import type { Result } from "@arcscord/error";
import type {
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from "discord.js";
import type { ArcClient, ComponentContext } from "#/base";
import type { ComponentRunReturn } from "#/base/components/interaction/component.type";
import type { ComponentHandler, ModalComponentHandler } from "#/base/components/interaction/component_handlers.type";
import type { CompiledComponentRoute } from "#/base/components/interaction/route";
import type {
  ComponentExecutionContext,
  ComponentExecutionHandler,
  ComponentExecutionOutcome,
  ComponentList,
  ComponentManagerOptions,
  ComponentResultHandler,
  ComponentResultHandlerInfos,
} from "#/manager/component/component_manager.type";
import type { ExecutionExit } from "#/utils/error/execution_exit";
import type { MaybePromise } from "#/utils/type/util.type";
import { anyToError, error, ok } from "@arcscord/error";
import { ComponentType } from "discord-api-types/v10";
import { MessageFlags } from "discord.js";
import { ButtonContext, componentHandlerTypeEnum } from "#/base/components";
import { ModalContext } from "#/base/components/interaction/context/modal_context";
import {
  ChannelSelectMenuContext,
  MentionableSelectMenuContext,
  RoleSelectMenuContext,
  StringSelectMenuContext,
  UserSelectMenuContext,
} from "#/base/components/interaction/context/select_menu_context";
import { compileComponentRoute, matchComponentRoute } from "#/base/components/interaction/route";
import { createExecutionControls } from "#/base/manager/execution_handler";
import { BaseManager } from "#/base/manager/manager.class";
import { diagnosticTiming, managerDiagnosticChannels } from "#/manager/diagnostics";
import {
  ArcscordError,
  arcscordErrorCodes,
  executionDefect,
  executionFailure,
  executionSuccess,
  isArcscordError,
  normalizeHandlerReturn,
} from "#/utils";
import { validateComponentMiddlewareNames } from "#/utils/validator/middleware_validator";
import {
  componentResultHandlerAdapter,
  defaultComponentExecutionHandler,
  runDefaultComponentExecution,
} from "./component_execution_handler";

type NormalizedComponentManagerOptions = {
  executionHandlers: readonly ComponentExecutionHandler[];
  resultHandler: ComponentResultHandler;
  dispatchDiagnostics: NonNullable<ComponentManagerOptions["dispatchDiagnostics"]>;
};

type MatchedComponent = {
  component: ComponentHandler;
  params: Record<string, string>;
};

/**
 * Manages and handles interactive components
 */
export class ComponentManager extends BaseManager {
  components: ComponentList = {
    [ComponentType.Button]: new Map(),
    [ComponentType.StringSelect]: new Map(),
    [ComponentType.UserSelect]: new Map(),
    [ComponentType.RoleSelect]: new Map(),
    [ComponentType.MentionableSelect]: new Map(),
    [ComponentType.ChannelSelect]: new Map(),
    modal: new Map<string, ModalComponentHandler>(),
  };

  options: NormalizedComponentManagerOptions;

  private compiledRoutes = new WeakMap<ComponentHandler, CompiledComponentRoute>();

  constructor(client: ArcClient, options?: ComponentManagerOptions) {
    super(client, "component");

    if (options?.executionHandlers !== undefined && options.resultHandler !== undefined) {
      throw new TypeError("component executionHandlers and resultHandler are mutually exclusive");
    }

    const executionHandlers = options?.executionHandlers
      ?? (options?.resultHandler
        ? [componentResultHandlerAdapter(options.resultHandler)]
        : [defaultComponentExecutionHandler]);

    this.options = {
      dispatchDiagnostics: {},
      ...options,
      executionHandlers,
      resultHandler: options?.resultHandler ?? this.defaultResultHandler.bind(this),
    };
    client.on("interactionCreate", (interaction) => {
      if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
        void this.handleInteraction(interaction);
      }
    });
  }

  /**
   * Loads an array of component properties and initializes the components.
   *
   * Loading stops at the first invalid or duplicate route and returns the
   * failure; every component before it stays loaded.
   *
   * @param components - components to loads
   * @returns the number of components loaded, or the loading failure.
   */
  loadComponents(
    components: ComponentHandler[],
  ): Result<number, ArcscordError<"COMPONENT_ROUTE_DUPLICATE" | "COMPONENT_ROUTE_INVALID" | "COMPONENT_VALIDATION_FAILED">> {
    let loaded = 0;
    for (const component of components) {
      const [err] = this.loadComponent(component);
      if (err !== null) {
        return error(err);
      }
      loaded++;
    }
    return ok(loaded);
  }

  /**
   * Load a single component
   * @param component - component to load
   * @returns `ok(true)` when loaded, or the route validation/duplication failure.
   */
  loadComponent(
    component: ComponentHandler,
  ): Result<true, ArcscordError<"COMPONENT_ROUTE_DUPLICATE" | "COMPONENT_ROUTE_INVALID" | "COMPONENT_VALIDATION_FAILED">> {
    const components = [component];
    const diagnostic = managerDiagnosticChannels.component.load.hasSubscribers;
    const operationId = diagnostic ? Symbol("arcscord:manager:component:load") : undefined;
    const startedAt = diagnostic ? Date.now() : 0;
    if (diagnostic) {
      managerDiagnosticChannels.component.load.publish({
        phase: "start",
        manager: this,
        client: this.client,
        timestamp: startedAt,
        operationId: operationId!,
        startedAt,
        components,
      });
    }
    const fail = (err: ArcscordError<"COMPONENT_ROUTE_DUPLICATE" | "COMPONENT_ROUTE_INVALID" | "COMPONENT_VALIDATION_FAILED">): Result<true, typeof err> => {
      if (diagnostic && managerDiagnosticChannels.component.load.hasSubscribers) {
        managerDiagnosticChannels.component.load.publish({
          phase: "error",
          manager: this,
          client: this.client,
          timestamp: Date.now(),
          operationId: operationId!,
          components,
          error: err,
        });
      }
      return error(err);
    };
    let compiledRoute: CompiledComponentRoute;
    try {
      compiledRoute = compileComponentRoute(component.route);
    }
    catch (e) {
      if (isArcscordError(e) && e.code === arcscordErrorCodes.ComponentRouteInvalid) {
        return fail(e as ArcscordError<"COMPONENT_ROUTE_INVALID">);
      }
      return fail(new ArcscordError({
        code: arcscordErrorCodes.ComponentRouteInvalid,
        message: `Invalid component route "${component.route}"`,
        metadata: { route: component.route, reason: anyToError(e).message },
        cause: e,
      }));
    }

    const [middlewareValidationErr] = validateComponentMiddlewareNames(component.use, component.route);
    if (middlewareValidationErr !== null) {
      return fail(middlewareValidationErr);
    }

    const componentsList = component.handlerType === componentHandlerTypeEnum.modal
      ? this.components.modal
      : this.components[component.type];

    if (componentsList.has(compiledRoute.canonical)) {
      return fail(new ArcscordError({
        code: arcscordErrorCodes.ComponentRouteDuplicate,
        message: `Duplicate component route ${component.route}`,
        metadata: { route: component.route, canonicalRoute: compiledRoute.canonical },
      }));
    }

    this.compiledRoutes.set(component, compiledRoute);

    if (component.handlerType === componentHandlerTypeEnum.modal) {
      this.components.modal.set(compiledRoute.canonical, component);
    }
    else {
      this.setComponent(component.type, compiledRoute.canonical, component);
    }

    this.trace(
      `loaded ${component.handlerType || componentHandlerTypeEnum.messageComponent} ${"type" in component ? component.type : "modal"} with route ${component.route}`,
    );

    if (diagnostic && managerDiagnosticChannels.component.load.hasSubscribers) {
      managerDiagnosticChannels.component.load.publish({
        phase: "end",
        manager: this,
        client: this.client,
        operationId: operationId!,
        ...diagnosticTiming(startedAt),
        components,
        loaded: 1,
      });
    }
    return ok(true);
  }

  /**
   * Removes a loaded component by its registered route.
   *
   * @param route - The component route (customId pattern) used at registration.
   * @returns `true` when a component was removed.
   */
  unloadComponent(route: string): boolean {
    let canonical: string;
    try {
      canonical = compileComponentRoute(route).canonical;
    }
    catch {
      this.publishComponentUnload(route, undefined, false);
      return false;
    }

    for (const list of Object.values(this.components) as Map<string, ComponentHandler>[]) {
      const component = list.get(canonical);
      if (component) {
        list.delete(canonical);
        this.compiledRoutes.delete(component);
        this.trace(`unloaded component with route ${route}`);
        this.publishComponentUnload(route, component, true);
        return true;
      }
    }

    this.publishComponentUnload(route, undefined, false);
    return false;
  }

  private publishComponentUnload(route: string, component: ComponentHandler | undefined, removed: boolean): void {
    if (managerDiagnosticChannels.component.unload.hasSubscribers) {
      managerDiagnosticChannels.component.unload.publish({
        phase: "end",
        manager: this,
        client: this.client,
        timestamp: Date.now(),
        route,
        component,
        removed,
      });
    }
  }

  private setComponent<K extends Exclude<keyof ComponentList, "modal">>(
    type: K,
    canonical: string,
    component: ComponentList[K] extends Map<string, infer H> ? H : never,
  ): void {
    (this.components[type] as unknown as Map<string, typeof component>).set(canonical, component);
  }

  /**
   * @internal
   */
  private async handleInteraction(
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
  ): Promise<void> {
    /* Modal submit */
    if (interaction.isModalSubmit()) {
      return this.handleComponentInteraction(interaction, "modal");
    }

    switch (true) {
      case interaction.isButton(): {
        return this.handleComponentInteraction(interaction, ComponentType.Button);
      }

      case interaction.isStringSelectMenu(): {
        return this.handleComponentInteraction(interaction, ComponentType.StringSelect);
      }

      case interaction.isUserSelectMenu(): {
        return this.handleComponentInteraction(interaction, ComponentType.UserSelect);
      }

      case interaction.isRoleSelectMenu(): {
        return this.handleComponentInteraction(interaction, ComponentType.RoleSelect);
      }

      case interaction.isMentionableSelectMenu(): {
        return this.handleComponentInteraction(interaction, ComponentType.MentionableSelect);
      }

      case interaction.isChannelSelectMenu(): {
        return this.handleComponentInteraction(interaction, ComponentType.ChannelSelect);
      }
    }
  }

  private createContext(
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
    type: keyof ComponentList,
    locale: string,
    params: Record<string, string>,
    component: ComponentHandler,
  ): Result<ComponentContext, ArcscordError<"COMPONENT_CONTEXT_CREATION_FAILED">> {
    switch (type) {
      case ComponentType.Button:
        return ok(new ButtonContext(this.client, interaction as ButtonInteraction, { locale, params }));
      case ComponentType.StringSelect: {
        const stringSelectInteraction = interaction as StringSelectMenuInteraction;
        const typed = component as { typedSingleValue?: boolean };

        const values = typed.typedSingleValue === true
          ? stringSelectInteraction.values[0]
          : stringSelectInteraction.values;

        return ok(new StringSelectMenuContext(this.client, stringSelectInteraction, {
          locale,
          params,
          values: values as never,
        }) as ComponentContext);
      }
      case ComponentType.UserSelect:
        return ok(new UserSelectMenuContext(this.client, interaction as UserSelectMenuInteraction, {
          locale,
          params,
          values: (interaction as UserSelectMenuInteraction).users.map(u => u),
        }));
      case ComponentType.RoleSelect:
        return ok(new RoleSelectMenuContext(this.client, interaction as RoleSelectMenuInteraction, {
          locale,
          params,
          values: (interaction as RoleSelectMenuInteraction).roles.map(r => r),
        }));
      case ComponentType.MentionableSelect:
        return ok(new MentionableSelectMenuContext(this.client, interaction as MentionableSelectMenuInteraction, {
          locale,
          params,
          users: (interaction as MentionableSelectMenuInteraction).users.map(u => u),
          roles: (interaction as MentionableSelectMenuInteraction).roles.map(r => r),
        }));
      case ComponentType.ChannelSelect:
        return ok(new ChannelSelectMenuContext(this.client, interaction as ChannelSelectMenuInteraction, {
          locale,
          params,
          values: (interaction as ChannelSelectMenuInteraction).channels.map(c => c),
        }));
      case "modal":
        try {
          return ok(new ModalContext(this.client, interaction as ModalSubmitInteraction, {
            fields: (component as ModalComponentHandler).fields,
            locale,
            params,
          }));
        }
        catch (e) {
          return error(new ArcscordError({
            code: arcscordErrorCodes.ComponentContextCreationFailed,
            message: `failed to parse modal values for ${component.route}`,
            metadata: { interactionId: interaction.id, route: component.route, reason: "modal-value-parsing" },
            cause: e,
          }));
        }
      default:
        return error(new ArcscordError({
          code: arcscordErrorCodes.ComponentContextCreationFailed,
          message: `Unknown component type: ${type}`,
          metadata: { interactionId: interaction.id, route: component.route, reason: "unknown-component-type", type },
        }));
    }
  }

  private async handleComponentInteraction(
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
    type: keyof ComponentList,
  ): Promise<void> {
    const dispatchDiagnostic = managerDiagnosticChannels.component.dispatch.hasSubscribers;
    const dispatchOperationId = dispatchDiagnostic ? Symbol("arcscord:manager:component:dispatch") : undefined;
    const dispatchStartedAt = dispatchDiagnostic ? Date.now() : 0;
    if (dispatchDiagnostic) {
      managerDiagnosticChannels.component.dispatch.publish({
        phase: "start",
        manager: this,
        client: this.client,
        timestamp: dispatchStartedAt,
        operationId: dispatchOperationId!,
        startedAt: dispatchStartedAt,
        interaction,
      });
    }
    const locale = await this.client.localeManager.detectLanguage({
      interaction,
      user: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
    });

    /* Route matching */
    const [matchErr, matchedComponents] = this.findMatchingComponents(interaction, type);
    if (matchErr !== null) {
      this.publishComponentDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "match", matchErr, locale);
      /* findMatchingComponents returns an error for both "not found" and "multiple matches" */
      const isMultiple = matchErr.code === arcscordErrorCodes.ComponentMultipleMatches;
      return this.sendDispatchError(
        isMultiple
          ? this.options.dispatchDiagnostics.multipleMatches
          : this.options.dispatchDiagnostics.componentNotFound,
        "error",
        matchErr,
        { interaction, locale },
      );
    }

    const matched = matchedComponents[0];

    /* Typed string select value validation */
    if (type === ComponentType.StringSelect) {
      const [validationErr] = this.validateTypedStringSelect(
        matched.component,
        interaction as StringSelectMenuInteraction,
      );
      if (validationErr !== null) {
        this.publishComponentDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "values", validationErr, locale);
        return this.sendDispatchError(
          this.options.dispatchDiagnostics.typedSelectInvalidValues,
          "error",
          validationErr,
          { interaction, locale },
        );
      }
    }

    /* Context creation */
    const [ctxErr, context] = this.createContext(interaction, type, locale, matched.params, matched.component);
    if (ctxErr !== null) {
      this.publishComponentDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "context", ctxErr, locale);
      return this.sendDispatchError(
        this.options.dispatchDiagnostics.contextCreationFailed,
        "error",
        ctxErr,
        { interaction, locale },
      );
    }

    /* Defer */
    const [deferErr] = await this.handlePreReply(matched.component, context);
    if (deferErr !== null) {
      this.publishComponentDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "defer", deferErr, locale);
      return this.sendDispatchError(
        this.options.dispatchDiagnostics.deferFailed,
        "warn",
        deferErr,
        undefined, // interaction state unknown after failed defer
      );
    }

    const startedAt = Date.now();
    const execution: ComponentExecutionContext = {
      component: matched.component,
      interaction,
      context,
      get defer() {
        return context.defer;
      },
      locale,
      ...createExecutionControls<string | true>(startedAt),
    };

    const executeDiagnostic = managerDiagnosticChannels.component.execute.hasSubscribers;
    const executeOperationId = executeDiagnostic ? Symbol("arcscord:manager:component:execute") : undefined;
    if (executeDiagnostic) {
      managerDiagnosticChannels.component.execute.publish({
        phase: "start",
        manager: this,
        client: this.client,
        timestamp: startedAt,
        operationId: executeOperationId!,
        startedAt,
        execution,
      });
    }
    const outcome = await this.runExecutionHandlers(
      this.options.executionHandlers,
      execution,
      () => this.executeComponent(execution),
      this,
    );
    if (!outcome) {
      const err = new Error("component execution handler failed");
      if (executeDiagnostic && managerDiagnosticChannels.component.execute.hasSubscribers) {
        managerDiagnosticChannels.component.execute.publish({
          phase: "error",
          manager: this,
          client: this.client,
          timestamp: Date.now(),
          operationId: executeOperationId!,
          execution,
          error: err,
        });
      }
      this.publishComponentDispatchError(dispatchDiagnostic, dispatchOperationId, interaction, "execution", err, locale);
      return;
    }
    if (executeDiagnostic && managerDiagnosticChannels.component.execute.hasSubscribers) {
      managerDiagnosticChannels.component.execute.publish({
        phase: "end",
        manager: this,
        client: this.client,
        timestamp: outcome.endedAt,
        operationId: executeOperationId!,
        startedAt: outcome.startedAt,
        endedAt: outcome.endedAt,
        durationMs: outcome.durationMs,
        execution,
        outcome,
      });
    }
    if (dispatchDiagnostic && managerDiagnosticChannels.component.dispatch.hasSubscribers) {
      managerDiagnosticChannels.component.dispatch.publish({
        phase: "end",
        manager: this,
        client: this.client,
        operationId: dispatchOperationId!,
        ...diagnosticTiming(dispatchStartedAt),
        interaction,
        outcome,
      });
    }
  }

  private publishComponentDispatchError(
    active: boolean,
    operationId: symbol | undefined,
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
    stage: import("#/manager/diagnostics").ComponentDispatchStage,
    err: unknown,
    locale?: string,
  ): void {
    if (active && managerDiagnosticChannels.component.dispatch.hasSubscribers) {
      managerDiagnosticChannels.component.dispatch.publish({
        phase: "error",
        manager: this,
        client: this.client,
        timestamp: Date.now(),
        operationId: operationId!,
        interaction,
        stage,
        locale,
        error: err,
      });
    }
  }

  /**
   * Validates the selected values of a `createTypedStringMenu` component
   * against its declared allowed set. No-op for plain (untyped) string
   * selects, which never have `typedAllowedValues` set.
   */
  private validateTypedStringSelect(
    component: ComponentHandler,
    interaction: StringSelectMenuInteraction,
  ): Result<true, ArcscordError<"COMPONENT_TYPED_SELECT_INVALID_VALUES">> {
    const typed = component as {
      typedSingleValue?: boolean;
      typedAllowedValues?: ReadonlySet<string>;
    };

    if (!typed.typedAllowedValues) {
      return ok(true);
    }

    const invalidValues = interaction.values.filter(
      value => !typed.typedAllowedValues!.has(value),
    );
    if (invalidValues.length > 0) {
      return error(new ArcscordError({
        code: arcscordErrorCodes.ComponentTypedSelectInvalidValues,
        message: `received invalid values for typed string select ${component.route}`,
        metadata: {
          interactionId: interaction.id,
          route: component.route,
          allowedValues: [...typed.typedAllowedValues],
          invalidValues,
          selectedValues: interaction.values,
        },
      }));
    }

    if (typed.typedSingleValue && interaction.values.length > 1) {
      return error(new ArcscordError({
        code: arcscordErrorCodes.ComponentTypedSelectInvalidValues,
        message: `received multiple values for typed single-string select ${component.route}`,
        metadata: {
          interactionId: interaction.id,
          route: component.route,
          allowedValues: [...typed.typedAllowedValues],
          selectedValues: interaction.values,
        },
      }));
    }

    return ok(true);
  }

  private findMatchingComponents(
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
    type: keyof ComponentList,
  ): Result<MatchedComponent[], ArcscordError<"COMPONENT_NOT_FOUND" | "COMPONENT_MULTIPLE_MATCHES">> {
    const components: MatchedComponent[] = [];
    const componentsList = this.components[type];

    for (const [, component] of componentsList.entries()) {
      const compiledRoute = this.compiledRoutes.get(component) ?? compileComponentRoute(component.route);
      const params = matchComponentRoute(compiledRoute, interaction.customId);

      if (params !== null) {
        components.push({ component, params });
      }
    }

    if (components.length === 0) {
      return error(new ArcscordError({
        code: arcscordErrorCodes.ComponentNotFound,
        message: `component with ID ${interaction.customId} was not found`,
        metadata: {
          interactionId: interaction.id,
          route: interaction.customId,
          availableRoutes: componentsList.keys(),
          type,
        },
      }));
    }

    if (components.length > 1) {
      return error(new ArcscordError({
        code: arcscordErrorCodes.ComponentMultipleMatches,
        message: `found more than one component that matches with ${interaction.customId}`,
        metadata: { interactionId: interaction.id, route: interaction.customId },
      }));
    }

    return ok(components);
  }

  private async handlePreReply(component: ComponentHandler, context: ComponentContext): Promise<Result<true, ArcscordError<"COMPONENT_DEFER_FAILED">>> {
    if (component.preReply) {
      const [err] = await context.deferReply({
        flags: component.preReply === "ephemeral" ? MessageFlags.Ephemeral : undefined,
      });
      if (err !== null) {
        return error(new ArcscordError({
          code: arcscordErrorCodes.ComponentDeferFailed,
          message: "Failed to defer reply",
          metadata: { interactionId: context.interaction.id, route: component.route },
          cause: err,
        }));
      }
    }
    return ok(true);
  }

  private async executeComponent(
    execution: ComponentExecutionContext,
  ): Promise<ComponentExecutionOutcome> {
    const { component, context } = execution;
    const middlewareExit = await this.runMiddleware(component, context);

    if (middlewareExit.status !== "success") {
      return execution.complete(middlewareExit);
    }
    if (!middlewareExit.value) {
      return execution.cancel();
    }
    context.additional = middlewareExit.value as typeof context.additional;

    try {
      // `component.run` and `context` are each unions correlated by construction
      // (see `createContext`'s exhaustive switch), but that link isn't provable
      // statically once both are widened back to their general union types here.
      const rawResult = await (component.run as (ctx: ComponentContext) => MaybePromise<ComponentRunReturn>)(context);
      return execution.complete(normalizeHandlerReturn(rawResult));
    }
    catch (e) {
      return execution.complete(executionDefect(e));
    }
  }

  private async runMiddleware(component: ComponentHandler, context: ComponentContext): Promise<ExecutionExit<object | false, unknown>> {
    const additional: Record<string, NonNullable<unknown>> = {};
    if (!component.use || component.use.length === 0) {
      return executionSuccess({});
    }
    for (const middleware of component.use) {
      try {
        const result = await middleware.run(context);
        if (result.status === "failure") {
          return executionFailure(await result.failure);
        }

        if (result.status === "cancel") {
          if (result.result) {
            const exit = normalizeHandlerReturn(await result.result);
            if (exit.status !== "success") {
              return exit;
            }
          }
          return executionSuccess(false);
        }
        additional[middleware.name] = result.value;
      }
      catch (e) {
        return executionDefect(e);
      }
    }
    return executionSuccess(additional);
  }

  /**
   * Default result handler.
   * Logs errors, sends an ephemeral error reply, and logs successful executions at debug level.
   *
   * A custom `resultHandler` can call this to reuse the default behavior after
   * running its own logic: `return manager.defaultResultHandler(infos)`.
   *
   * @deprecated Use {@link defaultComponentExecutionHandler} in
   * `executionHandlers`.
   */
  async defaultResultHandler(infos: ComponentResultHandlerInfos): Promise<void> {
    return runDefaultComponentExecution(infos, {
      kind: "completed",
      exit: infos.exit,
      startedAt: infos.startedAt,
      endedAt: infos.endedAt,
      durationMs: infos.durationMs,
      incidentId: infos.incidentId,
    }, this);
  }
}
