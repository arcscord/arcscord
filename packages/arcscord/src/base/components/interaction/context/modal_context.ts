import type { ModalSubmitInteraction } from "discord.js";
import type { ArcClient, BaseComponentContextOptions } from "#/base";
import type { ComponentMiddleware } from "#/base/components/interaction/component_middleware";
import type { ModalFields, ModalFieldValues } from "#/base/components/shared/component_definer.type";
import { BaseComponentContext } from "#/base/components/interaction/context/base_context";

/** A raw value read from a submitted modal field before it is parsed into a typed value. */
export type ModalContextValue = string | readonly unknown[] | boolean | null | undefined;

/**
 * Options used to build a {@link ModalContext}: the {@link BaseComponentContextOptions}
 * plus the modal's field definitions used to type the parsed values.
 *
 * @typeParam M - The list of component middlewares.
 * @typeParam Route - The modal's route pattern used to type its params.
 * @typeParam Fields - The modal field definitions used to type the parsed values.
 */
export type ModalContextOptions<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
  Fields extends ModalFields | undefined = ModalFields | undefined,
> = BaseComponentContextOptions<M, Route> & {
  fields?: Fields;
};

export function readModalRawValues(interaction: ModalSubmitInteraction): Map<string, ModalContextValue> {
  const values: [string, ModalContextValue][] = [];
  for (const field of interaction.fields.fields.values()) {
    if ("value" in field) {
      values.push([field.customId, field.value]);
    }
    else if ("values" in field) {
      values.push([field.customId, field.values]);
    }
  }

  return new Map<string, ModalContextValue>(values);
}

export function readModalRawFields(interaction: ModalSubmitInteraction): Map<string, unknown> {
  return new Map(
    [...interaction.fields.fields.entries()].map(([customId, field]) => [customId, field as unknown]),
  );
}

export function parseModalFieldValues<Fields extends ModalFields>(
  fields: Fields,
  rawValues: Map<string, ModalContextValue>,
  rawFields: Map<string, unknown>,
): ModalFieldValues<Fields> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.parse({
      customId: key,
      field: rawFields.get(key),
      value: rawValues.get(key),
    })]),
  ) as ModalFieldValues<Fields>;
}

/**
 * `DmModalContext` is a class representing the context of a modal interaction within a direct message (DM).
 */
export class ModalContext<
  M extends ComponentMiddleware[] = ComponentMiddleware[],
  Route extends string = string,
  Values = Record<string, ModalContextValue>,
> extends BaseComponentContext<M, Route> {
  interaction: ModalSubmitInteraction;

  /**
   * Parsed values by field name.
   */
  values: Values;

  /**
   * Raw map of Discord field custom IDs to submitted values.
   */
  rawValues: Map<string, ModalContextValue>;

  /**
   * Raw Discord modal data by custom ID.
   */
  rawFields: Map<string, unknown>;

  /**
   * Constructs a DM modal context.
   * @param client - The ArcClient instance.
   * @param interaction - The modal submit interaction.
   * @param options
   */
  constructor(
    client: ArcClient,
    interaction: ModalSubmitInteraction,
    options: ModalContextOptions<M, Route>,
  ) {
    super(client, interaction, options);

    this.interaction = interaction;
    this.rawFields = readModalRawFields(interaction);
    this.rawValues = readModalRawValues(interaction);

    this.values = (options.fields
      ? parseModalFieldValues(options.fields, this.rawValues, this.rawFields)
      : Object.fromEntries(this.rawValues.entries())) as Values;
  }

  isModalContext(): this is ModalContext<M, Route, Values> {
    return true;
  }
}
