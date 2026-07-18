import type { APISeparatorComponent, SeparatorSpacingSize } from "discord-api-types/v10";
import type { SeparatorComponentData } from "discord.js";
import type { ComponentBuilderLike } from "./component";
import { ComponentType } from "discord-api-types/v10";
import { normalizeSeparator } from "./internal/normalize-display";

/** String separator spacing shortcuts accepted by {@link separator}. */
export type StringSeparatorSpacingSize = "small" | "large";

/** Discord.js data, raw API data, or a builder accepted as a separator child. */
export type SeparatorComponentInput
  = | (Omit<SeparatorComponentData, "spacing"> & {
    readonly spacing?: SeparatorSpacingSize | StringSeparatorSpacingSize;
  })
  | APISeparatorComponent
  | ComponentBuilderLike<APISeparatorComponent>;

/** Options for {@link separator}, with string spacing shortcuts. */
export type SeparatorOptions = Omit<SeparatorComponentData, "type" | "spacing"> & {
  readonly spacing?: SeparatorSpacingSize | StringSeparatorSpacingSize;
};

/**
 * Creates a separator component.
 *
 * @param options - Optional `divider`, `id`, and numeric or `"small" | "large"` spacing.
 * Separators have no children.
 * @example
 * ```ts
 * separator({ divider: true, spacing: "large" })
 * ```
 */
export function separator(options: SeparatorOptions = {}): SeparatorComponentData {
  return normalizeSeparator({ ...options, type: ComponentType.Separator });
}
