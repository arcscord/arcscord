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
import type { MaybePromise } from "#/utils/type/util.type";
import { BaseError } from "@arcscord/better-error";
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
import { ComponentError } from "#/utils";
import { normalizeRunReturn } from "#/utils/error/run_normalize";

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
      throw new BaseError(`Duplicate component route ${component.route}`);
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
  ): Result<ComponentContext, ComponentError> {
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
          return error(new ComponentError({
            message: `failed to parse modal values for ${component.route}`,
            interaction,
            originalError: anyToError(e),
          }));
        }
      default:
        return error(new ComponentError({
          message: `Unknown component type: ${type}`,
          interaction,
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
    const start = Date.now();
    const [middlewareErr, middlewareResult] = await this.runMiddleware(matched.component, context);
    if (middlewareErr) {
      return this.options.resultHandler({
        status: "thrown",
        thrownValue: middlewareErr,
        component: matched.component,
        interaction,
        context,
        locale,
        defer: context.defer,
        start,
        end: Date.now(),
      });
    }
    if (!this.handleMiddlewareResult(middlewareResult, context)) {
      return;
    }

    await this.executeComponent(matched.component, context, start);
  }

  /**
   * Validates the selected values of a `createTypedStringMenu` component
   * against its declared allowed set. No-op for plain (untyped) string
   * selects, which never have `typedAllowedValues` set.
   */
  private validateTypedStringSelect(
    component: ComponentHandler,
    interaction: StringSelectMenuInteraction,
  ): Result<true, ComponentError> {
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
      return error(new ComponentError({
        message: `received invalid values for typed string select ${component.route}`,
        interaction,
        debugs: {
          allowedValues: [...typed.typedAllowedValues],
          invalidValues,
          selectedValues: interaction.values,
        },
      }));
    }

    if (typed.typedSingleValue && interaction.values.length > 1) {
      return error(new ComponentError({
        message: `received multiples values for typed single string select ${component.route}`,
        interaction,
        debugs: {
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
  ): Result<MatchedComponent[], ComponentError> {
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
      return error(new ComponentError({
        message: `didn't found component with id ${interaction.customId}`,
        interaction,
        debugs: {
          availableRoutes: componentsList.keys(),
          type,
        },
      }));
    }

    if (components.length > 1) {
      return error(new ComponentError({
        message: `found more than one component that matches with ${interaction.customId}`,
        interaction,
      }));
    }

    return ok(components);
  }

  private async handlePreReply(component: ComponentHandler, context: ComponentContext): Promise<Result<true, ComponentError>> {
    if (component.preReply) {
      const [err] = await context.deferReply({
        flags: component.preReply === "ephemeral" ? MessageFlags.Ephemeral : undefined,
      });
      if (err) {
        return error(new ComponentError({
          message: "Failed to defer reply",
          interaction: context.interaction,
          originalError: err,
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

  private async executeComponent(component: ComponentHandler, context: ComponentContext, start: number): Promise<void> {
    try {
      // `component.run` and `context` are each unions correlated by construction
      // (see `createContext`'s exhaustive switch), but that link isn't provable
      // statically once both are widened back to their general union types here.
      const rawResult = await (component.run as (ctx: ComponentContext) => MaybePromise<ComponentRunReturn>)(context);
      return this.options.resultHandler({
        status: "returned",
        result: normalizeRunReturn(rawResult),
        component,
        interaction: context.interaction,
        context,
        locale: context.locale,
        defer: context.defer,
        start,
        end: Date.now(),
      });
    }
    catch (e) {
      return this.options.resultHandler({
        status: "thrown",
        thrownValue: e,
        component,
        interaction: context.interaction,
        context,
        locale: context.locale,
        defer: context.defer,
        start,
        end: Date.now(),
      });
    }
  }

  private async runMiddleware(component: ComponentHandler, context: ComponentContext): Promise<Result<object | false, ComponentError>> {
    const additional: Record<string, NonNullable<unknown>> = {};
    if (!component.use || component.use.length === 0) {
      return ok({});
    }
    const middlewareNames = new Set<string>();
    for (const middleware of component.use) {
      if (middlewareNames.has(middleware.name)) {
        return error(new ComponentError({
          message: `duplicate middleware name "${middleware.name}"`,
          interaction: context.interaction,
          debugs: {
            middlewareName: middleware.name,
          },
        }));
      }
      middlewareNames.add(middleware.name);
    }
    for (const middleware of component.use) {
      try {
        const result = await middleware.run(context);
        if (result.error) {
          return error(await result.error);
        }

        if (result.cancel) {
          const [err] = await result.cancel;
          if (err) {
            return error(err);
          }
          return ok(false);
        }
        additional[middleware.name] = result.next;
      }
      catch (e) {
        return error(new ComponentError({
          message: `failed to run middleware : ${anyToError(e).message}`,
          interaction: context.interaction,
          originalError: anyToError(e),
          debugs: {
            middlewareName: middleware.name,
          },
        }));
      }
    }
    return ok(additional);
  }

  /**
   * Sends an error reply to a component interaction, respecting the defer state.
   * Used by the default `handleResult`.
   */
  private async sendInternalError(err: ComponentError, infos: ComponentResultHandlerInfos): Promise<void> {
    const message = this.client.getErrorMessage(err.id, infos.locale);
    try {
      if (infos.defer) {
        await infos.interaction.editReply(message);
      }
      else {
        await infos.interaction.reply({ ...message, flags: MessageFlags.Ephemeral });
      }
    }
    catch (e) {
      this.logger.error("failed to send internal error message", {
        baseError: anyToError(e).message,
      });
    }
  }

  /**
   * Default result handler.
   * Logs errors, sends an ephemeral error reply, and logs successful executions at debug level.
   */
  async handleResult(infos: ComponentResultHandlerInfos): Promise<void> {
    if (infos.status === "thrown") {
      const err = new ComponentError({
        message: `failed to run component with route ${infos.component.route} : ${anyToError(infos.thrownValue).message}`,
        interaction: infos.interaction,
        originalError: anyToError(infos.thrownValue),
      });
      err.generateId();
      this.logger.logError(err);
      return this.sendInternalError(err, infos);
    }

    const [err] = infos.result;
    if (err !== null) {
      err.generateId();
      this.logger.logError(err);
      return this.sendInternalError(err, infos);
    }
    this.logger.debug(`Component executed: ${infos.component.route}`, {
      route: infos.component.route,
      interactionId: infos.interaction.id,
      guildId: infos.interaction.guildId,
      userId: infos.interaction.user.id,
    });
  }
}
