import type { APISectionComponent } from "discord-api-types/v10";
import type { SectionComponentData, TextDisplayComponentData, ThumbnailComponentData } from "discord.js";
import type { CanonicalButtonComponentData, DisplayButton } from "./action-row";
import type { CanonicalComponentData, ComponentBuilderLike } from "./component";
import type { TextDisplayInput } from "./text";
import type { ThumbnailInput } from "./thumbnail";
import { ComponentType } from "discord-api-types/v10";
import { MessageComponentValidationError } from "./validation-error";
import { isComponentInput, rootContext } from "./validation/context";
import { decodeSection, decodeSectionAccessory } from "./validation/layout";

/** Text accepted by {@link section}, including strings, Discord.js builders/data, and raw API data. */
export type SectionTextInput = TextDisplayInput;

/** An unwrapped Discord message button or thumbnail accepted by {@link accessory}. */
export type SectionAccessoryValue = DisplayButton | ThumbnailInput;

const sectionAccessoryMarker: unique symbol = Symbol("arcscord.sectionAccessory");

/** Branded wrapper produced by {@link accessory}; it can only be used as a section's final child. */
export type SectionAccessory = {
  readonly [sectionAccessoryMarker]: true;
  readonly value: CanonicalButtonComponentData | CanonicalComponentData<ThumbnailComponentData, ComponentType.Thumbnail>;
};

/** A text item or branded accessory accepted by {@link section}. */
export type SectionInput = SectionTextInput | SectionAccessory;

/** Options for {@link section}; its text and accessory are positional children. */
export type SectionOptions = Omit<SectionComponentData, "type" | "components" | "accessory">;

/** Canonical section data returned by validation. */
export type CanonicalSectionComponentData = Omit<SectionComponentData, "type" | "components" | "accessory"> & {
  readonly type: ComponentType.Section;
  readonly components: readonly CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>[];
  readonly accessory: CanonicalButtonComponentData | CanonicalComponentData<ThumbnailComponentData, ComponentType.Thumbnail>;
};

/** Discord.js data/builder, raw API data, or a flexible section definition. */
export type SectionComponentInput
  = | (Omit<SectionComponentData, "type" | "components" | "accessory"> & {
    readonly type: ComponentType.Section;
    readonly components: readonly SectionTextInput[];
    readonly accessory: SectionAccessoryValue;
  })
  | CanonicalSectionComponentData
  | SectionComponentData
  | APISectionComponent
  | ComponentBuilderLike<APISectionComponent>;

function isOptionsObject(value: SectionOptions | SectionTextInput): value is SectionOptions {
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
  return {
    [sectionAccessoryMarker]: true,
    value: decodeSectionAccessory(value, rootContext("accessory")),
  };
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
export function section(...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory]): CanonicalSectionComponentData;
/**
 * Creates a section with explicit options.
 *
 * @param options - Section fields such as `id`.
 * @param items - One or more supported text children followed by exactly one accessory.
 */
export function section(options: SectionOptions, ...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory]): CanonicalSectionComponentData;
export function section(
  first: SectionOptions | SectionTextInput,
  ...items: [SectionTextInput, ...SectionTextInput[], SectionAccessory] | [...SectionTextInput[], SectionAccessory]
): CanonicalSectionComponentData {
  const options = isOptionsObject(first) ? first : {};
  const allItems = isOptionsObject(first) ? items : [first, ...items];
  const possibleAccessory = allItems.at(-1);
  if (!isSectionAccessory(possibleAccessory)) {
    throw new MessageComponentValidationError({
      rule: "section-accessory",
      path: "section.accessory",
      message: "section requires accessory(...) as its last argument",
      componentType: ComponentType.Section,
    });
  }

  const textItems: SectionTextInput[] = [];
  for (const item of allItems.slice(0, -1)) {
    if (isSectionAccessory(item)) {
      throw new MessageComponentValidationError({
        rule: "section-accessory",
        path: "section.components",
        message: "accessory(...) must be the final section argument",
        componentType: ComponentType.Section,
      });
    }
    textItems.push(item);
  }

  return decodeSection({
    ...options,
    type: ComponentType.Section,
    components: textItems,
    accessory: possibleAccessory.value,
  }, rootContext("section"));
}
