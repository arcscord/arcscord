import type {
  APIMessageComponentEmoji,
  APISelectMenuDefaultValue,
} from "discord-api-types/v10";
import type {
  ChannelSelectMenuComponentData,
  InteractionButtonComponentData,
  LinkButtonComponentData,
  MentionableSelectMenuComponentData,
  RoleSelectMenuComponentData,
  SelectMenuComponentOptionData,
  StringSelectMenuComponentData,
  UserSelectMenuComponentData,
} from "discord.js";
import type {
  CanonicalButtonComponentData,
  DisplayButton,
  MessageActionRow,
  MessageActionRowInput,
  PremiumButtonComponentData,
  SelectMenuComponentData,
  SelectMenuInput,
} from "../action-row";
import type { ValidButtonStyle } from "./component-kinds";
import type { UnknownRecord, ValidationContext } from "./context";
import {
  ButtonStyle,
  ChannelType,
  ComponentType,
  SelectMenuDefaultValueType,
} from "discord-api-types/v10";
import {
  actionRowComponentTypes,
  buttonStyleAliases,
  isButtonStyleAlias,
  isSelectMenuType,
  isValidButtonStyle,
  rejectComponentPlacement,
  rejectUnexpectedComponentType,
  selectMenuComponentTypes,
} from "./component-kinds";
import {
  childContext,
  rootContext,
  serializeInput,
  validationFailure,
} from "./context";
import {
  assertComponentType,
  decodeArray,
  decodeBoolean,
  decodeComponentId,
  decodeInteger,
  decodeRecord,
  decodeSnowflake,
  decodeString,
  decodeUrl,
  optionalAliasedField,
  optionalField,
  requiredAliasedField,
  requiredField,
} from "./decoders";

const validChannelTypes = new Set<number>(
  Object.values(ChannelType).filter((value): value is number => typeof value === "number"),
);

function decodeButtonStyle(value: unknown, context: ValidationContext): ValidButtonStyle {
  const resolved = typeof value === "string" && isButtonStyleAlias(value)
    ? buttonStyleAliases[value]
    : value;
  if (!isValidButtonStyle(resolved)) {
    validationFailure(context, "button-style", `${context.path} must be a supported Discord button style`, ComponentType.Button, {
      actual: resolved,
    });
  }
  return resolved;
}

function decodeEmoji(value: unknown, context: ValidationContext): APIMessageComponentEmoji {
  const record = decodeRecord(value, context, ComponentType.Button);
  const id = optionalField(record, "id", context, (field, fieldContext) => decodeSnowflake(field, fieldContext, ComponentType.Button));
  const name = optionalField(record, "name", context, (field, fieldContext) => decodeString(field, fieldContext, 1, 100, ComponentType.Button));
  const animated = optionalField(record, "animated", context, (field, fieldContext) => decodeBoolean(field, fieldContext, ComponentType.Button));
  if (id === undefined && name === undefined) {
    validationFailure(context, "emoji-identity", `${context.path} must define an id or name`, ComponentType.Button);
  }
  return {
    ...(id === undefined ? {} : { id }),
    ...(name === undefined ? {} : { name }),
    ...(animated === undefined ? {} : { animated }),
  } satisfies APIMessageComponentEmoji;
}

function decodeButtonRecord(record: UnknownRecord, context: ValidationContext): CanonicalButtonComponentData {
  if (record.type !== undefined) {
    assertComponentType(record, ComponentType.Button, context);
  }

  const id = decodeComponentId(record, context);
  const style = requiredField(record, "style", context, decodeButtonStyle);
  const disabled = optionalField(record, "disabled", context, (value, fieldContext) => decodeBoolean(value, fieldContext, ComponentType.Button));
  const label = optionalField(record, "label", context, (value, fieldContext) => decodeString(value, fieldContext, 1, 80, ComponentType.Button));
  const emoji = optionalField(record, "emoji", context, decodeEmoji);
  const customId = optionalAliasedField(record, "customId", "custom_id", context, (value, fieldContext) => decodeString(value, fieldContext, 1, 100, ComponentType.Button));
  const skuId = optionalAliasedField(record, "skuId", "sku_id", context, (value, fieldContext) => decodeSnowflake(value, fieldContext, ComponentType.Button));
  const url = optionalField(record, "url", context, (value, fieldContext) => decodeUrl(value, fieldContext, ["http:", "https:", "discord:"], ComponentType.Button, 512));

  const common: {
    readonly type: ComponentType.Button;
    readonly style: ValidButtonStyle;
    readonly id?: number;
    readonly disabled?: boolean;
  } = {
    type: ComponentType.Button,
    style,
    ...(id === undefined ? {} : { id }),
    ...(disabled === undefined ? {} : { disabled }),
  };

  if (style === ButtonStyle.Premium) {
    const requiredSkuId = skuId ?? decodeSnowflake(undefined, childContext(context, "skuId"), ComponentType.Button);
    if (customId !== undefined || label !== undefined || url !== undefined || emoji !== undefined) {
      validationFailure(context, "premium-button-fields", `${context.path} premium button cannot define customId, label, url, or emoji`, ComponentType.Button);
    }
    return {
      ...common,
      style: ButtonStyle.Premium,
      skuId: requiredSkuId,
    } satisfies PremiumButtonComponentData;
  }

  if (skuId !== undefined) {
    validationFailure(childContext(context, "skuId"), "button-sku", `${context.path}.skuId is only valid for premium buttons`, ComponentType.Button);
  }
  if (label === undefined && emoji === undefined) {
    validationFailure(context, "button-content", `${context.path} must define a label or emoji`, ComponentType.Button);
  }

  if (style === ButtonStyle.Link) {
    const requiredUrl = url ?? decodeUrl(undefined, childContext(context, "url"), ["http:", "https:", "discord:"], ComponentType.Button, 512);
    if (customId !== undefined) {
      validationFailure(childContext(context, "customId"), "link-button-custom-id", `${context.path} link button cannot define customId`, ComponentType.Button);
    }
    return {
      ...common,
      style: ButtonStyle.Link,
      url: requiredUrl,
      ...(label === undefined ? {} : { label }),
      ...(emoji === undefined ? {} : { emoji }),
    } satisfies LinkButtonComponentData;
  }

  const requiredCustomId = customId ?? decodeString(undefined, childContext(context, "customId"), 1, 100, ComponentType.Button);
  if (url !== undefined) {
    validationFailure(childContext(context, "url"), "button-url", `${context.path}.url is only valid for link buttons`, ComponentType.Button);
  }
  return {
    ...common,
    style,
    customId: requiredCustomId,
    ...(label === undefined ? {} : { label }),
    ...(emoji === undefined ? {} : { emoji }),
  } satisfies InteractionButtonComponentData;
}

export function decodeButton(input: unknown, context: ValidationContext): CanonicalButtonComponentData {
  return decodeButtonRecord(serializeInput(input, context), context);
}

function decodeSelectOption(value: unknown, context: ValidationContext): SelectMenuComponentOptionData {
  const record = serializeInput(value, context);
  const label = requiredField(record, "label", context, (field, fieldContext) => decodeString(field, fieldContext, 1, 100, ComponentType.StringSelect));
  const optionValue = requiredField(record, "value", context, (field, fieldContext) => decodeString(field, fieldContext, 1, 100, ComponentType.StringSelect));
  const description = optionalField(record, "description", context, (field, fieldContext) => decodeString(field, fieldContext, 1, 100, ComponentType.StringSelect));
  const emoji = optionalField(record, "emoji", context, decodeEmoji);
  const isDefault = optionalField(record, "default", context, (field, fieldContext) => decodeBoolean(field, fieldContext, ComponentType.StringSelect));
  return {
    label,
    value: optionValue,
    ...(description === undefined ? {} : { description }),
    ...(emoji === undefined ? {} : { emoji }),
    ...(isDefault === undefined ? {} : { default: isDefault }),
  } satisfies SelectMenuComponentOptionData;
}

type DefaultValueType = SelectMenuDefaultValueType.User | SelectMenuDefaultValueType.Role | SelectMenuDefaultValueType.Channel;

function decodeDefaultValue<Type extends DefaultValueType>(
  value: unknown,
  context: ValidationContext,
  componentType: number,
  isAllowedType: (value: unknown) => value is Type,
): APISelectMenuDefaultValue<Type> {
  const record = serializeInput(value, context);
  const id = requiredField(record, "id", context, (field, fieldContext) => decodeSnowflake(field, fieldContext, componentType));
  const type = record.type;
  if (!isAllowedType(type)) {
    validationFailure(childContext(context, "type"), "select-menu-default-type", `${context.path} contains an incompatible default value type`, componentType, {
      actual: type,
    });
  }
  return { id, type };
}

function decodeDefaultValues<Type extends DefaultValueType>(
  record: UnknownRecord,
  context: ValidationContext,
  componentType: number,
  isAllowedType: (value: unknown) => value is Type,
): APISelectMenuDefaultValue<Type>[] | undefined {
  return optionalAliasedField(record, "defaultValues", "default_values", context, (value, fieldContext) => {
    return decodeArray(value, fieldContext, 0, 25, "select-menu-default-values", componentType, (item, itemContext) => {
      return decodeDefaultValue(item, itemContext, componentType, isAllowedType);
    });
  });
}

function assertDefaultCount(
  defaultValues: readonly unknown[] | undefined,
  context: ValidationContext,
  componentType: number,
  minimum: number,
  maximum: number,
): void {
  if (defaultValues !== undefined && (defaultValues.length < minimum || defaultValues.length > maximum)) {
    validationFailure(childContext(context, "defaultValues"), "select-menu-defaults", `${context.path}.defaultValues count must be within minValues and maxValues`, componentType, {
      defaultCount: defaultValues.length,
      minValues: minimum,
      maxValues: maximum,
    });
  }
}

function decodeSelectRecord(record: UnknownRecord, context: ValidationContext): SelectMenuComponentData {
  const type = record.type;
  if (!isSelectMenuType(type)) {
    rejectUnexpectedComponentType(record, context, selectMenuComponentTypes);
  }
  const id = decodeComponentId(record, context);
  const customId = requiredAliasedField(record, "customId", "custom_id", context, (value, fieldContext) => decodeString(value, fieldContext, 1, 100, type));
  const placeholder = optionalField(record, "placeholder", context, (value, fieldContext) => decodeString(value, fieldContext, 0, 150, type));
  const disabled = optionalField(record, "disabled", context, (value, fieldContext) => decodeBoolean(value, fieldContext, type));
  const required = optionalField(record, "required", context, (value, fieldContext) => decodeBoolean(value, fieldContext, type));
  const minValues = optionalAliasedField(record, "minValues", "min_values", context, (value, fieldContext) => decodeInteger(value, fieldContext, 0, 25, type));
  const maxValues = optionalAliasedField(record, "maxValues", "max_values", context, (value, fieldContext) => decodeInteger(value, fieldContext, 1, 25, type));
  const effectiveMinimum = minValues ?? 1;
  const effectiveMaximum = maxValues ?? 1;
  if (effectiveMinimum > effectiveMaximum) {
    validationFailure(context, "select-menu-bounds", `${context.path}.minValues cannot exceed maxValues`, type, {
      minValues: effectiveMinimum,
      maxValues: effectiveMaximum,
    });
  }

  const requiredProperty: { readonly required?: true } = required === true ? { required: true } : {};
  const base = {
    type,
    customId,
    ...(id === undefined ? {} : { id }),
    ...(placeholder === undefined ? {} : { placeholder }),
    ...(disabled === undefined ? {} : { disabled }),
    ...requiredProperty,
    ...(minValues === undefined ? {} : { minValues }),
    ...(maxValues === undefined ? {} : { maxValues }),
  };

  if (type === ComponentType.StringSelect) {
    const options = decodeArray(record.options, childContext(context, "options"), 1, 25, "select-menu-options", type, decodeSelectOption);
    const defaults = options.filter(option => option.default === true).length;
    if (defaults > 0 && (defaults < effectiveMinimum || defaults > effectiveMaximum)) {
      validationFailure(childContext(context, "options"), "select-menu-defaults", `${context.path} default option count must be within minValues and maxValues`, type, {
        defaultCount: defaults,
        minValues: effectiveMinimum,
        maxValues: effectiveMaximum,
      });
    }
    return { ...base, type, options } satisfies StringSelectMenuComponentData;
  }

  if (type === ComponentType.UserSelect) {
    const defaultValues = decodeDefaultValues(record, context, type, (value): value is SelectMenuDefaultValueType.User => value === SelectMenuDefaultValueType.User);
    assertDefaultCount(defaultValues, context, type, effectiveMinimum, effectiveMaximum);
    return {
      ...base,
      type,
      ...(defaultValues === undefined ? {} : { defaultValues }),
    } satisfies UserSelectMenuComponentData;
  }
  if (type === ComponentType.RoleSelect) {
    const defaultValues = decodeDefaultValues(record, context, type, (value): value is SelectMenuDefaultValueType.Role => value === SelectMenuDefaultValueType.Role);
    assertDefaultCount(defaultValues, context, type, effectiveMinimum, effectiveMaximum);
    return {
      ...base,
      type,
      ...(defaultValues === undefined ? {} : { defaultValues }),
    } satisfies RoleSelectMenuComponentData;
  }
  if (type === ComponentType.MentionableSelect) {
    const defaultValues = decodeDefaultValues(record, context, type, (value): value is SelectMenuDefaultValueType.User | SelectMenuDefaultValueType.Role => {
      return value === SelectMenuDefaultValueType.User || value === SelectMenuDefaultValueType.Role;
    });
    assertDefaultCount(defaultValues, context, type, effectiveMinimum, effectiveMaximum);
    return {
      ...base,
      type,
      ...(defaultValues === undefined ? {} : { defaultValues }),
    } satisfies MentionableSelectMenuComponentData;
  }

  const defaultValues = decodeDefaultValues(record, context, type, (value): value is SelectMenuDefaultValueType.Channel => value === SelectMenuDefaultValueType.Channel);
  assertDefaultCount(defaultValues, context, type, effectiveMinimum, effectiveMaximum);
  const channelTypes = optionalAliasedField(record, "channelTypes", "channel_types", context, (value, fieldContext) => {
    if (!Array.isArray(value)) {
      validationFailure(fieldContext, "channel-types", `${fieldContext.path} must be an array`, type);
    }
    return value.map((channelType, index) => {
      if (!isChannelType(channelType)) {
        validationFailure(childContext(fieldContext, index), "channel-types", `${fieldContext.path} must contain supported Discord channel types`, type);
      }
      return channelType;
    });
  });
  return {
    ...base,
    type,
    ...(defaultValues === undefined ? {} : { defaultValues }),
    ...(channelTypes === undefined ? {} : { channelTypes }),
  } satisfies ChannelSelectMenuComponentData;
}

function isChannelType(value: unknown): value is ChannelType {
  return typeof value === "number" && validChannelTypes.has(value);
}

export function decodeSelectMenu(input: unknown, context: ValidationContext): SelectMenuComponentData {
  return decodeSelectRecord(serializeInput(input, context), context);
}

function decodeActionRowChild(value: unknown, context: ValidationContext): CanonicalButtonComponentData | SelectMenuComponentData {
  const record = serializeInput(value, context);
  if (record.type === ComponentType.Button || (record.type === undefined && record.style !== undefined)) {
    return decodeButtonRecord(record, context);
  }
  if (isSelectMenuType(record.type)) {
    return decodeSelectRecord(record, context);
  }
  rejectComponentPlacement(record, context, actionRowComponentTypes);
}

export function decodeActionRow(input: unknown, context: ValidationContext): MessageActionRow {
  const record = serializeInput(input, context);
  assertComponentType(record, ComponentType.ActionRow, context);
  const id = decodeComponentId(record, context);
  const componentsContext = childContext(context, "components");
  const serializedComponents = decodeArray(record.components, componentsContext, 1, 5, "action-row-cardinality", ComponentType.ActionRow, serializeInput);
  const selectCount = serializedComponents.filter(component => isSelectMenuType(component.type)).length;
  const buttonCount = serializedComponents.filter(component => component.type === ComponentType.Button || (component.type === undefined && component.style !== undefined)).length;
  const hasValidComposition = buttonCount === serializedComponents.length
    || (selectCount === 1 && serializedComponents.length === 1);
  if (!hasValidComposition) {
    validationFailure(componentsContext, "action-row-composition", `${context.path} must contain one to five buttons or exactly one select menu`, ComponentType.ActionRow);
  }
  const components = serializedComponents.map((component, index) => decodeActionRowChild(component, childContext(componentsContext, index)));
  const selectMenus = components.filter((component): component is SelectMenuComponentData => isSelectMenuType(component.type));
  if (selectMenus.length > 0) {
    if (components.length !== 1 || selectMenus.length !== 1) {
      validationFailure(childContext(context, "components"), "action-row-composition", `${context.path} must contain one to five buttons or exactly one select menu`, ComponentType.ActionRow);
    }
    const selectMenu = selectMenus[0];
    if (selectMenu === undefined) {
      validationFailure(childContext(context, "components"), "action-row-composition", `${context.path} must contain exactly one select menu`, ComponentType.ActionRow);
    }
    return {
      type: ComponentType.ActionRow,
      components: [selectMenu],
      ...(id === undefined ? {} : { id }),
    };
  }
  const buttons = components.filter((component): component is CanonicalButtonComponentData => !isSelectMenuType(component.type));
  return {
    type: ComponentType.ActionRow,
    components: buttons,
    ...(id === undefined ? {} : { id }),
  };
}

/** Validates and normalizes a message button. */
export function validateButton(input: DisplayButton): CanonicalButtonComponentData {
  return decodeButton(input, rootContext("button"));
}

/** Validates and normalizes a message select menu. */
export function validateSelectMenu(input: SelectMenuInput): SelectMenuComponentData {
  return decodeSelectMenu(input, rootContext("selectMenu"));
}

/** Validates and normalizes a message action row recursively. */
export function validateActionRow(input: MessageActionRowInput): MessageActionRow {
  return decodeActionRow(input, rootContext("actionRow"));
}
