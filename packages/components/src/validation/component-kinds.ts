import type { UnknownRecord, ValidationContext } from "./context";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { childContext, componentTypeOf, validationFailure } from "./context";

type ButtonStyleAliases = {
  readonly primary: typeof ButtonStyle.Primary;
  readonly secondary: typeof ButtonStyle.Secondary;
  readonly success: typeof ButtonStyle.Success;
  readonly danger: typeof ButtonStyle.Danger;
  readonly link: typeof ButtonStyle.Link;
  readonly premium: typeof ButtonStyle.Premium;
  readonly blurple: typeof ButtonStyle.Primary;
  readonly grey: typeof ButtonStyle.Secondary;
  readonly green: typeof ButtonStyle.Success;
  readonly red: typeof ButtonStyle.Danger;
};

export const buttonStyleAliases: ButtonStyleAliases = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  link: ButtonStyle.Link,
  premium: ButtonStyle.Premium,
  blurple: ButtonStyle.Primary,
  grey: ButtonStyle.Secondary,
  green: ButtonStyle.Success,
  red: ButtonStyle.Danger,
};

export type ValidButtonStyle = typeof ButtonStyle.Primary
  | typeof ButtonStyle.Secondary
  | typeof ButtonStyle.Success
  | typeof ButtonStyle.Danger
  | typeof ButtonStyle.Link
  | typeof ButtonStyle.Premium;

const validButtonStyles: readonly ValidButtonStyle[] = [
  ButtonStyle.Primary,
  ButtonStyle.Secondary,
  ButtonStyle.Success,
  ButtonStyle.Danger,
  ButtonStyle.Link,
  ButtonStyle.Premium,
];

export type SelectMenuComponentType = typeof ComponentType.StringSelect
  | typeof ComponentType.UserSelect
  | typeof ComponentType.RoleSelect
  | typeof ComponentType.MentionableSelect
  | typeof ComponentType.ChannelSelect;

type ContainerChildComponentType = typeof ComponentType.ActionRow
  | typeof ComponentType.File
  | typeof ComponentType.MediaGallery
  | typeof ComponentType.Section
  | typeof ComponentType.Separator
  | typeof ComponentType.TextDisplay;

type TopLevelComponentType = typeof ComponentType.Container | ContainerChildComponentType;

export const selectMenuComponentTypes: readonly SelectMenuComponentType[] = [
  ComponentType.StringSelect,
  ComponentType.UserSelect,
  ComponentType.RoleSelect,
  ComponentType.MentionableSelect,
  ComponentType.ChannelSelect,
];

export const actionRowComponentTypes: readonly number[] = [ComponentType.Button, ...selectMenuComponentTypes];

export const sectionAccessoryComponentTypes: readonly number[] = [ComponentType.Button, ComponentType.Thumbnail];

export const containerChildComponentTypes: readonly ContainerChildComponentType[] = [
  ComponentType.ActionRow,
  ComponentType.File,
  ComponentType.MediaGallery,
  ComponentType.Section,
  ComponentType.Separator,
  ComponentType.TextDisplay,
];

export const topLevelComponentTypes: readonly TopLevelComponentType[] = [
  ComponentType.Container,
  ...containerChildComponentTypes,
];

export const messageComponentTypes: readonly number[] = [
  ...topLevelComponentTypes,
  ComponentType.Button,
  ComponentType.Thumbnail,
  ...selectMenuComponentTypes,
];

const knownComponentTypes = new Set<number>(
  Object.values(ComponentType).filter((value): value is number => typeof value === "number"),
);
const validButtonStyleSet = new Set<number>(validButtonStyles);
const selectMenuComponentTypeSet = new Set<number>(selectMenuComponentTypes);
const containerChildComponentTypeSet = new Set<number>(containerChildComponentTypes);

export function isButtonStyleAlias(value: string): value is keyof typeof buttonStyleAliases {
  return Object.hasOwn(buttonStyleAliases, value);
}

export function isValidButtonStyle(value: unknown): value is ValidButtonStyle {
  return typeof value === "number" && validButtonStyleSet.has(value);
}

export function isSelectMenuType(value: unknown): value is SelectMenuComponentType {
  return typeof value === "number" && selectMenuComponentTypeSet.has(value);
}

export function isContainerChildType(value: unknown): value is ContainerChildComponentType {
  return typeof value === "number" && containerChildComponentTypeSet.has(value);
}

export function isTopLevelComponentType(value: unknown): value is TopLevelComponentType {
  return value === ComponentType.Container || isContainerChildType(value);
}

/** Rejects a component whose discriminator is not accepted by the current decoder. */
export function rejectUnexpectedComponentType(
  record: UnknownRecord,
  context: ValidationContext,
  expected: readonly number[],
): never {
  validationFailure(
    childContext(context, "type"),
    "unexpected-component-type",
    `${context.path}.type must be one of the accepted component types`,
    componentTypeOf(record),
    { actual: record.type, expected: [...expected] },
  );
}

/** Rejects a known Discord component that is not permitted at a nesting location. */
export function rejectComponentPlacement(
  record: UnknownRecord,
  context: ValidationContext,
  allowed: readonly number[],
): never {
  if (typeof record.type !== "number" || !knownComponentTypes.has(record.type)) {
    return rejectUnexpectedComponentType(record, context, allowed);
  }
  validationFailure(
    childContext(context, "type"),
    "component-placement",
    `Component type ${record.type} is not allowed at ${context.path}`,
    record.type,
    { actual: record.type, allowed: [...allowed] },
  );
}
