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
import type { ComponentList, ComponentManagerOptions, ComponentResultHandlerInfos } from "#/manager/component/component_manager.type";
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
import { BaseManager } from "#/base/manager/manager.class";
import { ArcscordError, arcscordErrorCodes, executionDefect, executionFailure, executionSuccess, normalizeHandlerReturn } from "#/utils";

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

  options: Required<ComponentManagerOptions>;

  private compiledRoutes = new WeakMap<ComponentHandler, CompiledComponentRoute>();

  constructor(client: ArcClient, options?: ComponentManagerOptions) {
    super(client, "component");

    this.options = {
      resultHandler: this.handleResult.bind(this),
      dispatchDiagnostics: {},
      ...options,
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
   * @param components - components to loads
   * @returns the number of components loaded
   */
  loadComponents(components: ComponentHandler[]): number {
    for (const component of components) {
      this.loadComponent(component);
    }
    return components.length;
  }

  /**
   * Load a single component
   * @param component - component to load
   */
  loadComponent(component: ComponentHandler): void {
    const compiledRoute = compileComponentRoute(component.route);
    const componentsList = component.handlerType === componentHandlerTypeEnum.modal
      ? this.components.modal
      : this.components[component.type];

    if (componentsList.has(compiledRoute.canonical)) {
      throw new ArcscordError({
        code: arcscordErrorCodes.ComponentRouteDuplicate,
        message: `Duplicate component route ${component.route}`,
        metadata: { route: component.route, canonicalRoute: compiledRoute.canonical },
      });
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
    await this.client.localeManager.ready;

    const locale = await this.client.localeManager.detectLanguage({
      interaction,
      user: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
    });

    /* Route matching */
    const [matchErr, matchedComponents] = this.findMatchingComponents(interaction, type);
    if (matchErr) {
      /* findMatchingComponents returns an error for both "not found" and "multiple matches" */
      const isMultiple = matchErr.message.includes("more than one");
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
      if (validationErr) {
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
    if (ctxErr) {
      return this.sendDispatchError(
        this.options.dispatchDiagnostics.contextCreationFailed,
        "error",
        ctxErr,
        { interaction, locale },
      );
    }

    /* Defer */
    const [deferErr] = await this.handlePreReply(matched.component, context);
    if (deferErr) {
      return this.sendDispatchError(
        this.options.dispatchDiagnostics.deferFailed,
        "warn",
        deferErr,
        undefined, // interaction state unknown after failed defer
      );
    }

    /* Middlewares */
    const startedAt = Date.now();
    const middlewareExit = await this.runMiddleware(matched.component, context);
    if (middlewareExit.status !== "success") {
      const endedAt = Date.now();
      return this.options.resultHandler({
        exit: middlewareExit,
        component: matched.component,
        interaction,
        context,
        locale,
        defer: context.defer,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        incidentId: middlewareExit.status === "defect" ? crypto.randomUUID() : undefined,
      });
    }
    if (!this.handleMiddlewareResult(middlewareExit.value, context)) {
      return;
    }

    await this.executeComponent(matched.component, context, startedAt);
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
        message: `received multiples values for typed single string select ${component.route}`,
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
        message: `didn't found component with id ${interaction.customId}`,
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
      if (err) {
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

  private handleMiddlewareResult(middlewareResult: object | false, context: ComponentContext): boolean {
    if (!middlewareResult) {
      return false;
    }

    context.additional = middlewareResult as typeof context.additional;
    return true;
  }

  private async executeComponent(component: ComponentHandler, context: ComponentContext, startedAt: number): Promise<void> {
    try {
      // `component.run` and `context` are each unions correlated by construction
      // (see `createContext`'s exhaustive switch), but that link isn't provable
      // statically once both are widened back to their general union types here.
      const rawResult = await (component.run as (ctx: ComponentContext) => MaybePromise<ComponentRunReturn>)(context);
      const endedAt = Date.now();
      return this.options.resultHandler({
        exit: normalizeHandlerReturn(rawResult),
        component,
        interaction: context.interaction,
        context,
        locale: context.locale,
        defer: context.defer,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
      });
    }
    catch (e) {
      const endedAt = Date.now();
      return this.options.resultHandler({
        exit: executionDefect(e),
        component,
        interaction: context.interaction,
        context,
        locale: context.locale,
        defer: context.defer,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        incidentId: crypto.randomUUID(),
      });
    }
  }

  private async runMiddleware(component: ComponentHandler, context: ComponentContext): Promise<ExecutionExit<object | false, unknown>> {
    const additional: Record<string, NonNullable<unknown>> = {};
    if (!component.use || component.use.length === 0) {
      return executionSuccess({});
    }
    const middlewareNames = new Set<string>();
    for (const middleware of component.use) {
      if (middlewareNames.has(middleware.name)) {
        return executionFailure(new ArcscordError({
          code: arcscordErrorCodes.CommandValidationFailed,
          message: `duplicate middleware name "${middleware.name}"`,
          metadata: { rule: "unique-middleware-name", middlewareName: middleware.name },
        }));
      }
      middlewareNames.add(middleware.name);
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
   * Sends an error reply to a component interaction, respecting the defer state.
   * Used by the default `handleResult`.
   */
  private async sendFailureReply(incidentId: string, infos: ComponentResultHandlerInfos): Promise<void> {
    const message = this.client.getErrorMessage(incidentId, infos.locale);
    try {
      if (infos.defer) {
        await infos.interaction.editReply(message);
      }
      else {
        await infos.interaction.reply({ ...message, flags: MessageFlags.Ephemeral });
      }
    }
    catch (e) {
      this.logger.error("failed to send failure reply", {
        baseError: anyToError(e).message,
      });
    }
  }

  /**
   * Default result handler.
   * Logs errors, sends an ephemeral error reply, and logs successful executions at debug level.
   */
  async handleResult(infos: ComponentResultHandlerInfos): Promise<void> {
    const meta = {
      route: infos.component.route,
      interactionId: infos.interaction.id,
      guildId: infos.interaction.guildId,
      userId: infos.interaction.user.id,
      durationMs: infos.durationMs,
      incidentId: infos.incidentId,
    };
    if (infos.exit.status === "defect") {
      const incidentId = infos.incidentId ?? crypto.randomUUID();
      this.logger.logError(infos.exit.defect, { ...meta, incidentId });
      return this.sendFailureReply(incidentId, infos);
    }
    if (infos.exit.status === "failure") {
      const incidentId = crypto.randomUUID();
      this.logger.logError(infos.exit.failure, { ...meta, incidentId });
      return this.sendFailureReply(incidentId, infos);
    }
    if (infos.exit.status === "interrupted") {
      this.logger.warn("Component execution interrupted", meta);
      return;
    }
    this.logger.debug(`Component executed: ${infos.component.route}`, {
      ...meta,
      value: infos.exit.value,
    });
  }
}
