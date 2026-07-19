import type { ComponentType } from "discord-api-types/v10";
import type { BaseComponentData, JSONEncodable } from "discord.js";

/** Discord.js component data with an exact discriminating component type. */
export type CanonicalComponentData<
  Data extends BaseComponentData,
  Type extends ComponentType,
> = Omit<Data, "type"> & {
  readonly type: Type;
};

/** A Discord.js builder or another object that serializes to the requested Discord API shape. */
export type ComponentBuilderLike<ApiComponent> = JSONEncodable<ApiComponent>;
