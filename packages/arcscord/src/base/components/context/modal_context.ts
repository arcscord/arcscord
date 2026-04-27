import type { ModalSubmitInteraction } from "discord.js";
import type { ArcClient, BaseComponentContextOptions } from "#/base";
import type { ComponentMiddleware } from "#/base/components/component_middleware";
import { BaseComponentContext } from "#/base/components/context/base_context";

export type ModalContextValue = string | readonly string[] | boolean | null;

/**
 * `DmModalContext` is a class representing the context of a modal interaction within a direct message (DM).
 */
export class ModalContext<M extends ComponentMiddleware[] = ComponentMiddleware[]> extends BaseComponentContext<M> {
  interaction: ModalSubmitInteraction;

  /**
   * Map of field custom IDs to their submitted values.
   */
  values: Map<string, ModalContextValue>;

  /**
   * Constructs a DM modal context.
   * @param client - The ArcClient instance.
   * @param interaction - The modal submit interaction.
   * @param options
   */
  constructor(client: ArcClient, interaction: ModalSubmitInteraction, options: BaseComponentContextOptions<M>) {
    super(client, interaction, options);

    this.interaction = interaction;

    const values: [string, ModalContextValue][] = [];
    for (const field of interaction.fields.fields.values()) {
      if ("value" in field) {
        values.push([field.customId, field.value]);
      }
      else if ("values" in field) {
        values.push([field.customId, field.values]);
      }
    }

    this.values = new Map<string, ModalContextValue>(values);
  }

  isModalContext(): this is ModalContext {
    return true;
  }
}
