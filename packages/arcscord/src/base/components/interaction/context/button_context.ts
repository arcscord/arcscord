import type { ButtonInteraction } from "discord.js";
import type { ArcClient, BaseComponentContextOptions } from "#/base";
import type { ComponentMiddleware } from "#/base/components/interaction/component_middleware";
import { MessageComponentContext } from "#/base/components/interaction/context/message_component_context";

/**
 * BaseButtonContext class.
 * Extends MessageComponentContext and provides context for button interactions.
 */
export class ButtonContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
> extends MessageComponentContext<M, Route> {
  interaction: ButtonInteraction;

  /**
   * Creates an instance of BaseButtonContext.
   * @param client - The ArcClient instance.
   * @param interaction - The ButtonInteraction instance.
   * @param options
   */
  constructor(client: ArcClient, interaction: ButtonInteraction, options: BaseComponentContextOptions<M, Route>) {
    super(client, interaction, options);

    this.interaction = interaction;
  }

  isButtonContext(): this is ButtonContext<M, Route> {
    return true;
  }
}
