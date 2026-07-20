import type { TextDisplayInput } from "@arcscord/components";
import type {
  APIButtonComponent,
  APISelectMenuComponent,
  APISelectMenuDefaultValue,
  ButtonBuilder,
  ButtonComponentData,
  ChannelSelectMenuBuilder,
  CheckboxComponentData,
  CheckboxGroupComponentData,
  SelectMenuDefaultValueType as DJSSelectMenuDefaultValueType,
  FileUploadComponentData,
  LabelComponentData,
  MentionableSelectMenuBuilder,
  RadioGroupComponentData,
  RoleSelectMenuBuilder,
  SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  TextDisplayComponentData,
  TextInputComponentData,
  UserSelectMenuBuilder,
} from "discord.js";
import type {
  AnySelectMenuComponentData,
  Button,
  Checkbox,
  CheckboxGroup,
  ComponentInLabel,
  FileUpload,
  Label,
  ModalSelectMenu,
  RadioGroup,
  SelectMenu,
  SelectOptions,
  TextInput,
  TypedSelectMenuOptions,
} from "#/base/components/shared/component_definer.type";
import { ComponentType } from "discord-api-types/v10";
import {
  buttonTypeEnum,
  textInputStyleEnum,
} from "#/base/components/shared/component.enum";
import { channelTypeEnum } from "#/utils/discord/type/channel.enum";

type DiscordSelectMenuBuilder
  = | StringSelectMenuBuilder
    | UserSelectMenuBuilder
    | RoleSelectMenuBuilder
    | MentionableSelectMenuBuilder
    | ChannelSelectMenuBuilder;

type ButtonInput = Button | ButtonBuilder;
export type SelectMenuInput = SelectMenu | DiscordSelectMenuBuilder;

function isButtonBuilder(button: ButtonInput): button is ButtonBuilder {
  return "toJSON" in button;
}

function isSelectMenuBuilder(selectMenu: SelectMenuInput): selectMenu is DiscordSelectMenuBuilder {
  return "toJSON" in selectMenu;
}

function apiButtonToData(button: APIButtonComponent): ButtonComponentData {
  if ("sku_id" in button) {
    return {
      type: ComponentType.Button,
      style: button.style,
      skuId: button.sku_id,
      disabled: button.disabled,
    } as unknown as ButtonComponentData;
  }

  if ("custom_id" in button) {
    return {
      type: ComponentType.Button,
      style: button.style,
      customId: button.custom_id,
      label: button.label,
      emoji: button.emoji,
      disabled: button.disabled,
    };
  }

  return {
    type: ComponentType.Button,
    style: button.style,
    url: button.url,
    label: button.label,
    emoji: button.emoji,
    disabled: button.disabled,
  };
}

export function buttonToAPI(button: ButtonInput): ButtonComponentData {
  if (isButtonBuilder(button)) {
    return apiButtonToData(button.toJSON());
  }

  if ("skuId" in button) {
    return {
      type: ComponentType.Button,
      style: typeof button.style === "string" ? buttonTypeEnum[button.style] : button.style,
      skuId: button.skuId,
      disabled: button.disabled,
    } as unknown as ButtonComponentData;
  }

  if ("customId" in button) {
    return {
      type: ComponentType.Button,
      style: typeof button.style === "string" ? buttonTypeEnum[button.style] : button.style,
      customId: button.customId,
      label: button.label,
      emoji: button.emoji,
      disabled: button.disabled,
    };
  }
  return {
    type: ComponentType.Button,
    style: typeof button.style === "string" ? buttonTypeEnum[button.style] : button.style,
    url: button.url,
    label: button.label,
    emoji: button.emoji,
    disabled: button.disabled,
  };
}

function apiSelectMenuToData(
  selectMenu: APISelectMenuComponent,
): AnySelectMenuComponentData {
  const base = {
    customId: selectMenu.custom_id,
    placeholder: selectMenu.placeholder,
    disabled: selectMenu.disabled,
    required: selectMenu.required ? true as const : undefined,
    minValues: selectMenu.min_values,
    maxValues: selectMenu.max_values,
  };

  switch (selectMenu.type) {
    case ComponentType.StringSelect:
      return {
        ...base,
        type: ComponentType.StringSelect,
        options: selectMenu.options,
      };
    case ComponentType.ChannelSelect:
      return {
        ...base,
        type: ComponentType.ChannelSelect,
        defaultValues: selectMenu.default_values,
        channelTypes: selectMenu.channel_types,
      };
    case ComponentType.UserSelect:
      return {
        ...base,
        type: ComponentType.UserSelect,
        defaultValues: selectMenu.default_values,
      };
    case ComponentType.RoleSelect:
      return {
        ...base,
        type: ComponentType.RoleSelect,
        defaultValues: selectMenu.default_values,
      };
    case ComponentType.MentionableSelect:
      return {
        ...base,
        type: ComponentType.MentionableSelect,
        defaultValues: selectMenu.default_values,
      };
  }
}

export function selectMenuOptionsToAPI(
  options: string[] | SelectOptions[] | TypedSelectMenuOptions,
): SelectMenuComponentOptionData[] {
  if (!Array.isArray(options)) {
    return Object.keys(options).map((key) => {
      const option = options[key];
      if (typeof option === "string") {
        return {
          label: key,
          value: option,
        };
      }

      return {
        ...option,
        value: key,
      };
    });
  }

  if (options.every(item => typeof item === "string")) {
    return options.map((option) => {
      return {
        label: option as string,
        value: option as string,
      };
    });
  }
  return options as SelectMenuComponentOptionData[];
}

export function selectMenuToAPI(
  selectMenu: SelectMenuInput,
): AnySelectMenuComponentData {
  if (isSelectMenuBuilder(selectMenu)) {
    return apiSelectMenuToData(selectMenu.toJSON());
  }

  if (selectMenu.type === ComponentType.StringSelect) {
    return {
      type: ComponentType.StringSelect,
      customId: selectMenu.customId,
      placeholder: selectMenu.placeholder,
      disabled: selectMenu.disabled,
      required: selectMenu.required ? true : undefined,
      minValues: selectMenu.minValues,
      maxValues: selectMenu.maxValues,
      options: selectMenuOptionsToAPI(selectMenu.options),
    };
  }

  if (selectMenu.type === ComponentType.ChannelSelect) {
    return {
      type: ComponentType.ChannelSelect,
      customId: selectMenu.customId,
      placeholder: selectMenu.placeholder,
      disabled: selectMenu.disabled,
      required: selectMenu.required ? true : undefined,
      minValues: selectMenu.minValues,
      maxValues: selectMenu.maxValues,
      defaultValues: selectMenu.defaultValues as // fix error with enum
      | APISelectMenuDefaultValue<DJSSelectMenuDefaultValueType.Channel>[]
      | undefined,
      channelTypes: selectMenu.channelTypes
        ? selectMenu.channelTypes.map(type => channelTypeEnum[type])
        : undefined,
    };
  }

  if (selectMenu.type === ComponentType.UserSelect) {
    return {
      type: ComponentType.UserSelect,
      customId: selectMenu.customId,
      placeholder: selectMenu.placeholder,
      disabled: selectMenu.disabled,
      required: selectMenu.required ? true : undefined,
      minValues: selectMenu.minValues,
      maxValues: selectMenu.maxValues,
      defaultValues: selectMenu.defaultValues as
      | APISelectMenuDefaultValue<DJSSelectMenuDefaultValueType.User>[]
      | undefined,
    };
  }

  if (selectMenu.type === ComponentType.RoleSelect) {
    return {
      type: ComponentType.RoleSelect,
      customId: selectMenu.customId,
      placeholder: selectMenu.placeholder,
      disabled: selectMenu.disabled,
      required: selectMenu.required ? true : undefined,
      minValues: selectMenu.minValues,
      maxValues: selectMenu.maxValues,
      defaultValues: selectMenu.defaultValues as
      | APISelectMenuDefaultValue<DJSSelectMenuDefaultValueType.Role>[]
      | undefined,
    };
  }

  return {
    type: ComponentType.MentionableSelect,
    customId: selectMenu.customId,
    placeholder: selectMenu.placeholder,
    disabled: selectMenu.disabled,
    required: selectMenu.required ? true : undefined,
    minValues: selectMenu.minValues,
    maxValues: selectMenu.maxValues,
    defaultValues: selectMenu.defaultValues as
    | APISelectMenuDefaultValue<DJSSelectMenuDefaultValueType.User | DJSSelectMenuDefaultValueType.Role>[]
    | undefined,
  };
}

export function textInputToAPI(textInput: TextInput | TextInputComponentData): TextInputComponentData {
  return {
    type: ComponentType.TextInput,
    customId: textInput.customId,
    ...(textInput.label ? { label: textInput.label } : {}),
    style: typeof textInput.style === "string"
      ? textInputStyleEnum[textInput.style]
      : textInput.style,
    minLength: textInput.minLength,
    maxLength: textInput.maxLength,
    required: textInput.required,
    value: textInput.value,
    placeholder: textInput.placeholder,
  } as TextInputComponentData;
}

export function textDisplayToAPI(textDisplay: TextDisplayInput): TextDisplayComponentData {
  if (typeof textDisplay === "string") {
    return {
      type: ComponentType.TextDisplay,
      content: textDisplay,
    };
  }

  const display = "toJSON" in textDisplay ? textDisplay.toJSON() : textDisplay;
  return {
    type: ComponentType.TextDisplay,
    id: display.id,
    content: display.content,
  };
}

export function fileUploadToAPI(fileUpload: FileUpload): FileUploadComponentData {
  return {
    type: ComponentType.FileUpload,
    id: fileUpload.id,
    customId: fileUpload.customId,
    minValues: fileUpload.minValues,
    maxValues: fileUpload.maxValues,
    required: fileUpload.required,
  };
}

export function radioGroupToAPI(radioGroup: RadioGroup): RadioGroupComponentData {
  return {
    type: ComponentType.RadioGroup,
    id: radioGroup.id,
    customId: radioGroup.customId,
    options: radioGroup.options,
    required: radioGroup.required,
  };
}

export function checkboxGroupToAPI(checkboxGroup: CheckboxGroup): CheckboxGroupComponentData {
  return {
    type: ComponentType.CheckboxGroup,
    id: checkboxGroup.id,
    customId: checkboxGroup.customId,
    options: checkboxGroup.options,
    minValues: checkboxGroup.minValues,
    maxValues: checkboxGroup.maxValues,
    required: checkboxGroup.required,
  };
}

export function checkboxToAPI(checkbox: Checkbox): CheckboxComponentData {
  return {
    type: ComponentType.Checkbox,
    id: checkbox.id,
    customId: checkbox.customId,
    default: checkbox.default,
  };
}

function componentInLabelToAPI(component: ComponentInLabel): LabelComponentData["component"] {
  switch (component.type) {
    case ComponentType.TextInput:
      return textInputToAPI(component as TextInput | TextInputComponentData);
    case ComponentType.StringSelect:
    case ComponentType.UserSelect:
    case ComponentType.RoleSelect:
    case ComponentType.MentionableSelect:
    case ComponentType.ChannelSelect:
      return selectMenuToAPI(component as ModalSelectMenu);
    case ComponentType.FileUpload:
      return fileUploadToAPI(component as FileUpload);
    case ComponentType.RadioGroup:
      return radioGroupToAPI(component as RadioGroup);
    case ComponentType.CheckboxGroup:
      return checkboxGroupToAPI(component as CheckboxGroup);
    case ComponentType.Checkbox:
      return checkboxToAPI(component as Checkbox);
  }
}

export function labelToAPI(label: Label): LabelComponentData {
  return {
    type: ComponentType.Label,
    id: label.id,
    label: label.label,
    description: label.description,
    component: componentInLabelToAPI(label.component),
  };
}
