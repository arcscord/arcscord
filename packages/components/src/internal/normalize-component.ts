import type { APIContainerComponent } from "discord-api-types/v10";
import type { ContainerComponentData } from "discord.js";
import type { MessageActionRowInput } from "../action-row";
import type { ContainerChild, ContainerComponentInput } from "../container";
import type { FileComponentInput } from "../file";
import type { MediaGalleryComponentInput } from "../media-gallery";
import type { MessageV2Child, MessageV2Component } from "../message";
import type { SectionComponentInput } from "../section";
import type { SeparatorComponentInput } from "../separator";
import type { TextDisplayInput } from "../text";
import { ComponentType } from "discord-api-types/v10";
import { normalizeActionRow } from "./normalize-action-row";
import {
  normalizeFile,
  normalizeMediaGallery,
  normalizeSection,
  normalizeSeparator,
  normalizeTextDisplay,
} from "./normalize-display";
import { serializeComponent } from "./serialize";

/** Normalizes one component allowed inside a container. */
export function normalizeContainerChild(input: ContainerChild): ContainerComponentData["components"][number] {
  if (typeof input === "string") {
    return normalizeTextDisplay(input);
  }

  const component = serializeComponent(input);
  switch (component.type) {
    case ComponentType.ActionRow:
      return normalizeActionRow(input as MessageActionRowInput);
    case ComponentType.File:
      return normalizeFile(input as FileComponentInput);
    case ComponentType.MediaGallery:
      return normalizeMediaGallery(input as MediaGalleryComponentInput);
    case ComponentType.Section:
      return normalizeSection(input as SectionComponentInput);
    case ComponentType.Separator:
      return normalizeSeparator(input as SeparatorComponentInput);
    case ComponentType.TextDisplay:
      return normalizeTextDisplay(input as TextDisplayInput);
    default:
      throw new TypeError(`Unsupported container component type: ${String(component.type)}`);
  }
}

/** Normalizes a container and all its descendants. */
export function normalizeContainer(input: ContainerComponentInput): ContainerComponentData {
  const container = serializeComponent(input);
  return {
    type: ComponentType.Container,
    id: container.id as number | undefined,
    components: (container.components as readonly ContainerChild[]).map(normalizeContainerChild),
    accentColor: (container.accentColor ?? container.accent_color) as number | undefined,
    spoiler: container.spoiler as boolean | undefined,
  };
}

/** Normalizes one top-level Components V2 message child. */
export function normalizeMessageChild(input: MessageV2Child): MessageV2Component {
  if (typeof input === "string") {
    return normalizeTextDisplay(input);
  }

  const component = serializeComponent(input);
  if (component.type === ComponentType.Container) {
    return normalizeContainer(input as APIContainerComponent);
  }

  return normalizeContainerChild(input as ContainerChild) as MessageV2Component;
}
