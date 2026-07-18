import type {
  ButtonComponentData,
  MessageActionRowComponentData,
} from "discord.js";
import type {
  ActionRowComponentInput,
  DisplayButton,
  MessageActionRow,
  MessageActionRowInput,
  SelectMenuComponentData,
  SelectMenuInput,
} from "../action-row";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { serializeComponent } from "./serialize";

const buttonStyles = {
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
} as const;

function numericButtonStyle(style: unknown): ButtonStyle {
  if (typeof style === "string" && style in buttonStyles) {
    return buttonStyles[style as keyof typeof buttonStyles];
  }

  return style as ButtonStyle;
}

function isSelectMenuType(type: unknown): boolean {
  return type === ComponentType.StringSelect
    || type === ComponentType.UserSelect
    || type === ComponentType.RoleSelect
    || type === ComponentType.MentionableSelect
    || type === ComponentType.ChannelSelect;
}

/** Normalizes one supported button to Discord.js camelCase component data. */
export function normalizeButton(input: DisplayButton): ButtonComponentData {
  const button = serializeComponent(input);
  const style = numericButtonStyle(button.style);
  const common = {
    type: ComponentType.Button,
    id: button.id as number | undefined,
    style,
    disabled: button.disabled as boolean | undefined,
  };

  const skuId = (button.skuId ?? button.sku_id) as string | undefined;
  if (skuId !== undefined || style === ButtonStyle.Premium) {
    return { ...common, skuId } as unknown as ButtonComponentData;
  }

  const customId = (button.customId ?? button.custom_id) as string | undefined;
  if (customId !== undefined) {
    return {
      ...common,
      customId,
      label: button.label as string | undefined,
      emoji: button.emoji as ButtonComponentData["emoji"],
    } as ButtonComponentData;
  }

  return {
    ...common,
    url: button.url as string,
    label: button.label as string | undefined,
    emoji: button.emoji as ButtonComponentData["emoji"],
  } as ButtonComponentData;
}

/** Normalizes one supported select menu to Discord.js camelCase component data. */
export function normalizeSelectMenu(input: SelectMenuInput): SelectMenuComponentData {
  const select = serializeComponent(input);
  const base = {
    type: select.type,
    id: select.id as number | undefined,
    customId: (select.customId ?? select.custom_id) as string,
    placeholder: select.placeholder as string | undefined,
    disabled: select.disabled as boolean | undefined,
    required: select.required as true | undefined,
    minValues: (select.minValues ?? select.min_values) as number | undefined,
    maxValues: (select.maxValues ?? select.max_values) as number | undefined,
  };

  if (select.type === ComponentType.StringSelect) {
    return { ...base, options: select.options } as SelectMenuComponentData;
  }

  return {
    ...base,
    defaultValues: select.defaultValues ?? select.default_values,
    ...(select.type === ComponentType.ChannelSelect
      ? { channelTypes: select.channelTypes ?? select.channel_types }
      : {}),
  } as SelectMenuComponentData;
}

/** Normalizes one button/select action-row child and rejects unsupported component kinds. */
export function normalizeActionRowComponent(input: ActionRowComponentInput): ButtonComponentData | SelectMenuComponentData {
  const component = serializeComponent(input);
  if (component.type === ComponentType.Button || (component.type === undefined && "style" in component)) {
    return normalizeButton(input as DisplayButton);
  }

  if (isSelectMenuType(component.type)) {
    return normalizeSelectMenu(input as SelectMenuInput);
  }

  throw new TypeError(`Unsupported action row component type: ${String(component.type)}`);
}

/** Applies Discord's action-row cardinality rules after normalizing every child. */
export function normalizeActionRowItems(inputs: readonly ActionRowComponentInput[]): MessageActionRow["components"] {
  if (inputs.length < 1 || inputs.length > 5) {
    throw new RangeError("actionRow requires between one and five components");
  }

  const components = inputs.map(normalizeActionRowComponent);
  const selectMenus = components.filter(component => isSelectMenuType(component.type));
  if (selectMenus.length > 0 && (components.length !== 1 || selectMenus.length !== 1)) {
    throw new TypeError("actionRow accepts either one to five buttons or exactly one select menu");
  }

  return components;
}

/** Normalizes an existing Discord.js builder/data or raw API action row. */
export function normalizeActionRow(input: MessageActionRowInput): MessageActionRow {
  const row = serializeComponent(input);
  return {
    type: ComponentType.ActionRow,
    id: row.id as number | undefined,
    components: normalizeActionRowItems(row.components as readonly MessageActionRowComponentData[]),
  };
}
