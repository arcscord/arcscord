import type { APIContainerComponent } from "discord-api-types/v10";
import type {
  ContainerComponentData,
  FileComponentData,
  MediaGalleryComponentData,
  SeparatorComponentData,
  TextDisplayComponentData,
} from "discord.js";
import type { MessageActionRow, MessageActionRowInput } from "./action-row";
import type { CanonicalComponentData, ComponentBuilderLike } from "./component";
import type { FileComponentInput } from "./file";
import type { MediaGalleryComponentInput } from "./media-gallery";
import type { CanonicalSectionComponentData, SectionComponentInput } from "./section";
import type { SeparatorComponentInput } from "./separator";
import type { TextDisplayInput } from "./text";
import { ComponentType } from "discord-api-types/v10";
import { isComponentInput, rootContext } from "./validation/context";
import { decodeContainer } from "./validation/layout";

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

/** Canonical child stored in a validated container. */
export type CanonicalContainerChild
  = | MessageActionRow
    | CanonicalComponentData<FileComponentData, ComponentType.File>
    | CanonicalComponentData<MediaGalleryComponentData, ComponentType.MediaGallery>
    | CanonicalSectionComponentData
    | CanonicalComponentData<SeparatorComponentData, ComponentType.Separator>
    | CanonicalComponentData<TextDisplayComponentData, ComponentType.TextDisplay>;

/** Canonical container data returned by validation. */
export type CanonicalContainerComponentData = {
  readonly type: ComponentType.Container;
  readonly components: readonly CanonicalContainerChild[];
  readonly id?: number;
  readonly accentColor?: number;
  readonly spoiler?: boolean;
};

/** Discord.js data/builder, raw API data, or a flexible top-level container. */
export type ContainerComponentInput
  = | (Omit<ContainerComponentData, "components" | "accentColor"> & {
    readonly components: readonly ContainerChild[];
    readonly accentColor?: number | null;
  })
  | ContainerComponentData
  | CanonicalContainerComponentData
  | APIContainerComponent
  | ComponentBuilderLike<APIContainerComponent>;

function isOptionsObject(value: ContainerOptions | ContainerChild): value is ContainerOptions {
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
export function container(child: ContainerChild, ...children: ContainerChild[]): CanonicalContainerComponentData;
/**
 * Creates a container with explicit options.
 *
 * @param options - Optional `id`, `accentColor` (including `null`), and `spoiler`.
 * @param child - First supported non-container child.
 * @param children - Additional supported non-container children.
 */
export function container(options: ContainerOptions, child: ContainerChild, ...children: ContainerChild[]): CanonicalContainerComponentData;
export function container(first: ContainerOptions | ContainerChild, ...children: ContainerChild[]): CanonicalContainerComponentData {
  const options = isOptionsObject(first) ? first : {};
  const allChildren: readonly unknown[] = isOptionsObject(first) ? children : [first, ...children];
  return decodeContainer({
    type: ComponentType.Container,
    ...(options.id === undefined ? {} : { id: options.id }),
    ...(options.accentColor === undefined || options.accentColor === null ? {} : { accentColor: options.accentColor }),
    ...(options.spoiler === undefined ? {} : { spoiler: options.spoiler }),
    components: allChildren,
  }, rootContext("container"));
}
