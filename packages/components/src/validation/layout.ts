import type { ThumbnailComponentData } from "discord.js";
import type { CanonicalButtonComponentData } from "../action-row";
import type { CanonicalComponentData } from "../component";
import type {
  CanonicalContainerChild,
  CanonicalContainerComponentData,
  ContainerComponentInput,
} from "../container";
import type {
  CanonicalSectionComponentData,
  SectionComponentInput,
} from "../section";
import type { ValidationContext } from "./context";
import { ComponentType } from "discord-api-types/v10";
import {
  containerChildComponentTypes,
  isContainerChildType,
  rejectComponentPlacement,
  sectionAccessoryComponentTypes,
} from "./component-kinds";
import {
  childContext,
  rootContext,
  serializeInput,
} from "./context";
import {
  assertComponentType,
  decodeArray,
  decodeBoolean,
  decodeComponentId,
  decodeInteger,
  optionalAliasedField,
  optionalField,
} from "./decoders";
import {
  decodeFile,
  decodeMediaGallery,
  decodeSeparator,
  decodeTextDisplay,
  decodeThumbnail,
} from "./display";
import { decodeActionRow, decodeButton } from "./interactive";

function assertNever(value: never): never {
  throw new TypeError(`Unhandled component type: ${String(value)}`);
}

export function decodeSectionAccessory(
  input: unknown,
  context: ValidationContext,
): CanonicalButtonComponentData | CanonicalComponentData<ThumbnailComponentData, ComponentType.Thumbnail> {
  const record = serializeInput(input, context);
  if (record.type === ComponentType.Button || (record.type === undefined && record.style !== undefined)) {
    return decodeButton(record, context);
  }
  if (record.type === ComponentType.Thumbnail) {
    return decodeThumbnail(record, context);
  }
  rejectComponentPlacement(record, context, sectionAccessoryComponentTypes);
}

export function decodeSection(input: unknown, context: ValidationContext): CanonicalSectionComponentData {
  const record = serializeInput(input, context);
  assertComponentType(record, ComponentType.Section, context);
  const id = decodeComponentId(record, context);
  const components = decodeArray(record.components, childContext(context, "components"), 1, 3, "section-cardinality", ComponentType.Section, decodeTextDisplay);
  const accessory = decodeSectionAccessory(record.accessory, childContext(context, "accessory"));
  return {
    type: ComponentType.Section,
    components,
    accessory,
    ...(id === undefined ? {} : { id }),
  } satisfies CanonicalSectionComponentData;
}

export function decodeContainerChild(input: unknown, context: ValidationContext): CanonicalContainerChild {
  if (typeof input === "string") {
    return decodeTextDisplay(input, context);
  }
  const record = serializeInput(input, context);
  const type = record.type;
  if (!isContainerChildType(type)) {
    rejectComponentPlacement(record, context, containerChildComponentTypes);
  }
  switch (type) {
    case ComponentType.ActionRow:
      return decodeActionRow(record, context);
    case ComponentType.File:
      return decodeFile(record, context);
    case ComponentType.MediaGallery:
      return decodeMediaGallery(record, context);
    case ComponentType.Section:
      return decodeSection(record, context);
    case ComponentType.Separator:
      return decodeSeparator(record, context);
    case ComponentType.TextDisplay:
      return decodeTextDisplay(record, context);
    default:
      return assertNever(type);
  }
}

export function decodeContainer(input: unknown, context: ValidationContext): CanonicalContainerComponentData {
  const record = serializeInput(input, context);
  assertComponentType(record, ComponentType.Container, context);
  const id = decodeComponentId(record, context);
  const accentColor = optionalAliasedField(record, "accentColor", "accent_color", context, (value, fieldContext) => {
    if (value === null) {
      return null;
    }
    return decodeInteger(value, fieldContext, 0, 0xFF_FF_FF, ComponentType.Container);
  });
  const spoiler = optionalField(record, "spoiler", context, (value, fieldContext) => decodeBoolean(value, fieldContext, ComponentType.Container));
  const components = decodeArray(record.components, childContext(context, "components"), 1, 40, "container-cardinality", ComponentType.Container, decodeContainerChild);
  return {
    type: ComponentType.Container,
    components,
    ...(id === undefined ? {} : { id }),
    ...(accentColor === undefined || accentColor === null ? {} : { accentColor }),
    ...(spoiler === undefined ? {} : { spoiler }),
  } satisfies CanonicalContainerComponentData;
}

/** Validates and normalizes a section recursively. */
export function validateSection(input: SectionComponentInput): CanonicalSectionComponentData {
  return decodeSection(input, rootContext("section"));
}

/** Validates and normalizes a container recursively. */
export function validateContainer(input: ContainerComponentInput): CanonicalContainerComponentData {
  return decodeContainer(input, rootContext("container"));
}
