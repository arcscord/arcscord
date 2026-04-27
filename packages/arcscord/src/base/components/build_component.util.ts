import type {
  APISelectMenuDefaultValue,
  ButtonComponentData,
  CheckboxComponentData,
  CheckboxGroupComponentData,
  ContainerComponentData,
  SelectMenuDefaultValueType as DJSSelectMenuDefaultValueType,
  FileComponentData,
  FileUploadComponentData,
  LabelComponentData,
  MediaGalleryComponentData,
  RadioGroupComponentData,
  SectionComponentData,
  SelectMenuComponentOptionData,
  SeparatorComponentData,
  TextDisplayComponentData,
  TextInputComponentData,
  ThumbnailComponentData,
} from "discord.js";
import type {
  AnySelectMenuComponentData,
  Button,
  Checkbox,
  CheckboxGroup,
  ComponentInContainer,
  ComponentInLabel,
  Container,
  File,
  FileUpload,
  Label,
  MediaGallery,
  ModalSelectMenu,
  RadioGroup,
  Section,
  SelectMenu,
  SelectOptions,
  Separator,
  TextDisplay,
  TextInput,
  Thumbnail,
  TypedSelectMenuOptions,
} from "#/base/components/component_definer.type";
import { ComponentType } from "discord-api-types/v10";
import {
  buttonTypeEnum,
  separatorSpacingSizeEnum,
  textInputStyleEnum,
} from "#/base/components/component.enum";
import { channelTypeEnum } from "#/utils/discord/type/channel.enum";

export function buttonToAPI(button: Button): ButtonComponentData {
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
  selectMenu: SelectMenu,
): AnySelectMenuComponentData {
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

export function textDisplayToAPI(textDisplay: TextDisplay): TextDisplayComponentData {
  return {
    type: ComponentType.TextDisplay,
    id: textDisplay.id,
    content: textDisplay.content,
  };
}

export function thumbnailToAPI(thumbnail: Thumbnail): ThumbnailComponentData {
  return {
    type: ComponentType.Thumbnail,
    id: thumbnail.id,
    media: thumbnail.media,
    description: thumbnail.description,
    spoiler: thumbnail.spoiler,
  };
}

export function sectionToAPI(section: Section): SectionComponentData {
  return {
    type: ComponentType.Section,
    id: section.id,
    components: section.components.map(textDisplayToAPI),
    accessory: section.accessory.type === ComponentType.Button
      ? buttonToAPI(section.accessory)
      : thumbnailToAPI(section.accessory),
  };
}

export function mediaGalleryToAPI(mediaGallery: MediaGallery): MediaGalleryComponentData {
  return {
    type: ComponentType.MediaGallery,
    id: mediaGallery.id,
    items: mediaGallery.items,
  };
}

export function fileToAPI(file: File): FileComponentData {
  return {
    type: ComponentType.File,
    id: file.id,
    file: file.file,
    spoiler: file.spoiler,
  };
}

export function separatorToAPI(separator: Separator): SeparatorComponentData {
  return {
    type: ComponentType.Separator,
    id: separator.id,
    divider: separator.divider,
    spacing: typeof separator.spacing === "string"
      ? separatorSpacingSizeEnum[separator.spacing]
      : separator.spacing,
  };
}

export function componentInContainerToAPI(component: ComponentInContainer): ContainerComponentData["components"][number] {
  switch (component.type) {
    case ComponentType.ActionRow:
      return component as ContainerComponentData["components"][number];
    case ComponentType.File:
      return fileToAPI(component as File);
    case ComponentType.MediaGallery:
      return mediaGalleryToAPI(component as MediaGallery);
    case ComponentType.Section:
      return sectionToAPI(component as Section);
    case ComponentType.Separator:
      return separatorToAPI(component as Separator);
    case ComponentType.TextDisplay:
      return textDisplayToAPI(component as TextDisplay);
    default:
      throw new TypeError(`Unsupported container component type: ${component.type}`);
  }
}

export function containerToAPI(container: Container): ContainerComponentData {
  return {
    type: ComponentType.Container,
    id: container.id,
    components: container.components.map(componentInContainerToAPI),
    accentColor: container.accentColor ?? undefined,
    spoiler: container.spoiler,
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

export function componentInLabelToAPI(component: ComponentInLabel): LabelComponentData["component"] {
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
