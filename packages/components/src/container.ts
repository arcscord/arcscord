import type { APIContainerComponent } from "discord-api-types/v10";
import type { ContainerComponentData } from "discord.js";
import type { MessageActionRowInput } from "./action-row";
import type { ComponentBuilderLike } from "./component";
import type { FileComponentInput } from "./file";
import type { MediaGalleryComponentInput } from "./media-gallery";
import type { SectionComponentInput } from "./section";
import type { SeparatorComponentInput } from "./separator";
import type { TextDisplayInput } from "./text";
import { ComponentType } from "discord-api-types/v10";
import { normalizeContainer, normalizeContainerChild } from "./internal/normalize-component";
import { isComponentInput, serializeComponent } from "./internal/serialize";

/** Any valid non-container child accepted by {@link container}. */
export type ContainerChild
  = | TextDisplayInput
    | MessageActionRowInput
    | FileComponentInput
    | MediaGalleryComponentInput
    | SectionComponentInput
    | SeparatorComponentInput;

/** Options for {@link container}; its components are positional children. */
export type ContainerOptions = Omit<ContainerComponentData, "type" | "components" | "accentColor"> & {
  readonly accentColor?: number | null;
};

/** Discord.js data/builder, raw API data, or a flexible top-level container. */
export type ContainerComponentInput
  = | (Omit<ContainerComponentData, "components" | "accentColor"> & {
    readonly components: readonly ContainerChild[];
    readonly accentColor?: number | null;
  })
  | ContainerComponentData
  | APIContainerComponent
  | ComponentBuilderLike<APIContainerComponent>;

function isOptionsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !isComponentInput(value);
}

/**
 * Creates a container from valid Discord Components V2 children.
 *
 * @param child - First string/text display, section, separator, media gallery, file, or
 * message action row. Discord.js data/builders and raw API objects are accepted.
 * @param children - Additional children of the same supported kinds. Containers cannot nest.
 * @example
 * ```ts
 * container({ accentColor: 0x5865F2 }, "## Status", separator(), actionRow(refreshButton))
 * ```
 */
export function container(child: ContainerChild, ...children: ContainerChild[]): ContainerComponentData;
/**
 * Normalizes an existing complete container.
 *
 * @param input - Discord.js container data/`ContainerBuilder`, raw API data, or a
 * flexible container definition. All descendants are normalized recursively.
 */
export function container(input: ContainerComponentInput): ContainerComponentData;
/**
 * Creates a container with explicit options.
 *
 * @param options - Optional `id`, `accentColor` (including `null`), and `spoiler`.
 * @param child - First supported non-container child.
 * @param children - Additional supported non-container children.
 */
export function container(options: ContainerOptions, child: ContainerChild, ...children: ContainerChild[]): ContainerComponentData;
export function container(first: ContainerOptions | ContainerChild | ContainerComponentInput, ...children: ContainerChild[]): ContainerComponentData {
  if (typeof first !== "string" && isComponentInput(first)) {
    const component = serializeComponent(first);
    if (typeof component === "object" && component !== null && "type" in component && component.type === ComponentType.Container) {
      if (children.length > 0) {
        throw new TypeError("An existing container cannot be combined with additional children");
      }
      return normalizeContainer(component as unknown as APIContainerComponent);
    }
  }

  const options = isOptionsObject(first) ? first as ContainerOptions : {};
  const allChildren = isOptionsObject(first) ? children : [first as ContainerChild, ...children];
  return {
    type: ComponentType.Container,
    id: options.id,
    accentColor: options.accentColor ?? undefined,
    spoiler: options.spoiler,
    components: allChildren.map(normalizeContainerChild),
  };
}
