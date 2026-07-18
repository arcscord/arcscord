import type { APISectionComponent } from "discord-api-types/v10";
import type { SectionComponentData } from "discord.js";
import type { DisplayButton } from "./action-row";
import type { ComponentBuilderLike } from "./component";
import type { TextDisplayInput } from "./text";
import type { ThumbnailInput } from "./thumbnail";
import { ComponentType } from "discord-api-types/v10";
import { normalizeAccessory, normalizeSection, normalizeTextDisplay } from "./internal/normalize-display";
import { isComponentInput } from "./internal/serialize";

/** Text accepted by {@link section}, including strings, Discord.js builders/data, and raw API data. */
export type SectionTextInput = TextDisplayInput;

/** An unwrapped Discord message button or thumbnail accepted by {@link accessory}. */
export type SectionAccessoryValue = DisplayButton | ThumbnailInput;

declare const sectionAccessoryBrand: unique symbol;

/** Branded wrapper produced by {@link accessory}; it can only be used as a section's final child. */
export type SectionAccessory = {
  readonly [sectionAccessoryBrand]: true;
  readonly value: SectionAccessoryValue;
};

/** A text item or branded accessory accepted by {@link section}. */
export type SectionInput = SectionTextInput | SectionAccessory;

/** Options for {@link section}; its text and accessory are positional children. */
export type SectionOptions = Omit<SectionComponentData, "type" | "components" | "accessory">;

/** Discord.js data/builder, raw API data, or a flexible section definition. */
export type SectionComponentInput
  = | (Omit<SectionComponentData, "components" | "accessory"> & {
    readonly components: readonly SectionTextInput[];
    readonly accessory: SectionAccessoryValue;
  })
  | SectionComponentData
  | APISectionComponent
  | ComponentBuilderLike<APISectionComponent>;

const sectionAccessoryMarker = Symbol("arcscord.sectionAccessory");

function isOptionsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !isComponentInput(value);
}

function isSectionAccessory(value: unknown): value is SectionAccessory {
  return typeof value === "object" && value !== null && sectionAccessoryMarker in value;
}

/**
 * Marks a button or thumbnail as the required final child of {@link section}.
 *
 * @param value - Discord.js data/builder or raw API button/thumbnail data. Arcscord's
 * historical string-style button definitions remain supported.
 * @example
 * ```ts
 * accessory(new ThumbnailBuilder().setURL("https://example.com/status.png"))
 * ```
 */
export function accessory(value: SectionAccessoryValue): SectionAccessory {
  return { [sectionAccessoryMarker]: true, value } as unknown as SectionAccessory;
}

/**
 * Creates a section containing one or more text displays and exactly one accessory.
 *
 * @param items - Strings or text display data/builders/raw API objects, followed by
 * exactly one `accessory(buttonOrThumbnail)`.
 * @example
 * ```ts
 * section("## Status", "Operational", accessory(thumbnail({ media: { url: iconUrl } })))
 * ```
 */
export function section(...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory]): SectionComponentData;
/**
 * Creates a section with explicit options.
 *
 * @param options - Section fields such as `id`.
 * @param items - One or more supported text children followed by exactly one accessory.
 */
export function section(options: SectionOptions, ...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory]): SectionComponentData;
export function section(
  first: SectionOptions | SectionTextInput,
  ...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory] | [...SectionTextInput[], SectionAccessory]
): SectionComponentData {
  const options = isOptionsObject(first) ? first as SectionOptions : {};
  const allItems = isOptionsObject(first) ? items : [first, ...items];
  const possibleAccessory = allItems.at(-1);
  if (!isSectionAccessory(possibleAccessory)) {
    throw new TypeError("section requires accessory(...) as its last argument");
  }

  return normalizeSection({
    ...options,
    type: ComponentType.Section,
    components: allItems.slice(0, -1).map(item => normalizeTextDisplay(item as SectionTextInput)),
    accessory: normalizeAccessory(possibleAccessory.value),
  });
}
