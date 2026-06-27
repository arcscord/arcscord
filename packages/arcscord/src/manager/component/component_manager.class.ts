import type { Result } from "@arcscord/error";
import type {
  BaseMessageOptions,
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
import type { ComponentHandler, ModalComponentHandler } from "#/base/components/interaction/component_handlers.type";
import type { CompiledComponentRoute } from "#/base/components/interaction/route";
import type { TypedSelectMenuOptions } from "#/base/components/shared/component_definer.type";
import type { ComponentErrorHandlerInfos, ComponentList, ComponentManagerOptions, ComponentResultHandlerInfos } from "#/manager/component/component_manager.type";
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
import { ComponentError, internalErrorEmbed } from "#/utils";

type MatchedComponent = {
  component: ComponentHandler;
  params: Record<string, string>;
};

type TypedStringSelectComponent = ComponentHandler & {
  type: ComponentType.StringSelect;
  typedStringSelectSnapshots: Map<string, {
    values: TypedSelectMenuOptions;
    maxValues?: number;
  }>;
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
      errorHandler: this.handleError.bind(this),
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
      // @ts-expect-error fix error with others component types
      this.components[component.type].set(compiledRoute.canonical, component);
    }

    this.trace(
      `loaded ${component.handlerType || componentHandlerTypeEnum.messageComponent} ${"type" in component ? component.type : "modal"} with route ${component.route}`,
    );
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
        const [validationError, values] = this.validateStringSelectValues(stringSelectInteraction, component);
        if (validationError) {
          return error(validationError);
        }

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

  private isTypedStringSelectComponent(component: ComponentHandler): component is TypedStringSelectComponent {
    return (
      "type" in component
      && component.type === ComponentType.StringSelect
      && "typedStringSelectSnapshots" in component
      && component.typedStringSelectSnapshots instanceof Map
    );
  }

  private validateStringSelectValues(
    interaction: StringSelectMenuInteraction,
    component: ComponentHandler,
  ): Result<string | string[], ComponentError> {
    const selectedValues = interaction.values;

    if (!this.isTypedStringSelectComponent(component)) {
      return ok(selectedValues);
    }

    const snapshot = component.typedStringSelectSnapshots.get(interaction.customId);
    if (!snapshot) {
      return error(new ComponentError({
        message: `missing typed string select values snapshot for ${component.route}`,
        interaction,
        debugs: {
          customId: interaction.customId,
          route: component.route,
        },
      }));
    }

    const allowedValues = Object.keys(snapshot.values);
    const allowedValuesSet = new Set(allowedValues);
    const invalidValues = selectedValues.filter(value => !allowedValuesSet.has(value));

    if (invalidValues.length === 0) {
      return ok(snapshot.maxValues === 1 ? selectedValues[0] : selectedValues);
    }

    return error(new ComponentError({
      message: `received invalid values for typed string select ${component.route}`,
      interaction,
      debugs: {
        allowedValues,
        invalidValues,
        selectedValues,
      },
    }));
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

    const [err, components] = this.findMatchingComponents(interaction, type);
    if (err) {
      return this.options.errorHandler({
        error: err,
        component: undefined,
        context: undefined,
        internal: true,
        interaction,
      });
    }

    if (components.length < 1) {
      return this.options.errorHandler({
        interaction,
        error: new BaseError(`No found components with custom id match with ${interaction.customId}`),
        internal: false,
      });
    }

    if (components.length > 1) {
      return this.options.errorHandler({
        interaction,
        internal: false,
        error: new BaseError(`Find multiple match with custom id ${interaction.customId}`),
      });
    }

    const component = components[0];

    const [err2, context] = this.createContext(interaction, type, locale, component.params, component.component);
    if (err2) {
      return this.options.errorHandler({
        error: err2,
        internal: true,
      });
    }

    const [err3] = await this.handlePreReply(component.component, context);
    if (err3) {
      return this.options.errorHandler({
        error: err3,
        component: component.component,
        context,
        internal: true,
      });
    }

    const [err4, middlewareResult] = await this.runMiddleware(component.component, context);
    if (err4) {
      return this.options.errorHandler({
        error: err4,
        component: component.component,
        context,
        internal: false,
      });
    }
    if (!this.handleMiddlewareResult(middlewareResult, context)) {
      return;
    }

    await this.executeComponent(component.component, context);
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

  private async executeComponent(component: ComponentHandler, context: ComponentContext): Promise<void> {
    const start = Date.now();
    try {
      // @ts-expect-error fix error with others context types
      const result = await component.run(context);
      return this.options.resultHandler({
        result,
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
      const bError = new ComponentError({
        interaction: context.interaction,
        message: `failed to run component with route ${component.route}`,
        originalError: anyToError(e),
      });
      return this.options.resultHandler({
        result: error(bError),
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

  async sendInternalError(
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
    message: BaseMessageOptions,
    defer: boolean = false,
  ): Promise<void> {
    const replyResult = defer
      ? await interaction.editReply(message).then(ok).catch(error)
      : await interaction.reply({
          ...message,
          flags: MessageFlags.Ephemeral,
        }).then(ok).catch(error);

    if (!replyResult[1]) {
      this.logger.error("failed to send error message", {
        baseError: replyResult[0].message,
      });
    }
  }

  async handleResult(infos: ComponentResultHandlerInfos): Promise<void> {
    const [err] = infos.result;
    if (err !== null) {
      err.generateId();
      this.logger.logError(err);
      return this.sendInternalError(
        infos.interaction,
        internalErrorEmbed(this.client, err.id, infos.locale),
        infos.defer,
      );
    }

    this.logger.debug(`Component executed: ${infos.component.route}`);
  }

  async handleError(infos: ComponentErrorHandlerInfos): Promise<void> {
    const error = infos.error.generateId();
    this.logger.logError(error);

    if (!infos.interaction) {
      return;
    }

    if (!infos.internal) {
      return this.sendInternalError(
        infos.interaction,
        internalErrorEmbed(this.client, error.id, infos.context?.locale),
        infos.context?.defer,
      );
    }
  }
}
