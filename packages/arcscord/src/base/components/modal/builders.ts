import type {
  ActionRowData,
  ChannelSelectMenuComponentData,
  CheckboxComponentData,
  CheckboxGroupComponentData,
  FileUploadComponentData,
  LabelComponentData,
  MentionableSelectMenuComponentData,
  ModalComponentData,
  RadioGroupComponentData,
  RoleSelectMenuComponentData,
  StringSelectMenuComponentData,
  TextDisplayComponentData,
  TextInputComponentData,
  UserSelectMenuComponentData,
} from "discord.js";
import type {
  ChannelSelectMenu,
  Checkbox,
  CheckboxGroup,
  FileUpload,
  Label,
  LabeledTextInput,
  MentionableSelectMenu,
  ModalTopLevelComponent,
  RadioGroup,
  RoleSelectMenu,
  StringSelectMenu,
  TextDisplayInput,
  TextInput,
  TypedTextInput,
  UserSelectMenu,
} from "../shared/component_definer.type";
import { ComponentType } from "discord-api-types/v10";
import {
  checkboxGroupToAPI,
  checkboxToAPI,
  fileUploadToAPI,
  labelToAPI,
  radioGroupToAPI,
  selectMenuToAPI,
  textDisplayToAPI,
  textInputToAPI,
} from "../shared/to_api";

type ModalTopLevelComponentInput
  = | ModalTopLevelComponent
    | LabelComponentData
    | TextDisplayComponentData
    | string;

/**
 * Creates a string select menu component for a modal label.
 *
 * Discord modal select menus are nested in a Label component, not in an action row.
 */
export function stringSelectModalComponent(
  options: Omit<StringSelectMenu<"modal">, "type">,
): StringSelectMenuComponentData {
  return selectMenuToAPI({
    ...options,
    type: ComponentType.StringSelect,
  }) as StringSelectMenuComponentData;
}

/**
 * Creates a user select menu component for a modal label.
 */
export function userSelectModalComponent(
  option: Omit<UserSelectMenu<"modal">, "type">,
): UserSelectMenuComponentData {
  return selectMenuToAPI({
    ...option,
    type: ComponentType.UserSelect,
  }) as UserSelectMenuComponentData;
}

/**
 * Creates a role select menu component for a modal label.
 */
export function roleSelectModalComponent(
  option: Omit<RoleSelectMenu<"modal">, "type">,
): RoleSelectMenuComponentData {
  return selectMenuToAPI({
    ...option,
    type: ComponentType.RoleSelect,
  }) as RoleSelectMenuComponentData;
}

/**
 * Creates a mentionable select menu component for a modal label.
 */
export function mentionableSelectModalComponent(
  option: Omit<MentionableSelectMenu<"modal">, "type">,
): MentionableSelectMenuComponentData {
  return selectMenuToAPI({
    ...option,
    type: ComponentType.MentionableSelect,
  }) as MentionableSelectMenuComponentData;
}

/**
 * Creates a channel select menu component for a modal label.
 */
export function channelSelectModalComponent(
  option: Omit<ChannelSelectMenu<"modal">, "type">,
): ChannelSelectMenuComponentData {
  return selectMenuToAPI({
    ...option,
    type: ComponentType.ChannelSelect,
  }) as ChannelSelectMenuComponentData;
}

/**
 * Creates a text input component for a modal label or legacy action row modal.
 */
export function textInput(
  options: Omit<TextInput, "type">,
): TextInputComponentData {
  return textInputToAPI({ ...options, type: ComponentType.TextInput });
}

/**
 * Creates a file upload component for a modal label.
 */
export function fileUpload(
  options: Omit<FileUpload, "type">,
): FileUploadComponentData {
  return fileUploadToAPI({ ...options, type: ComponentType.FileUpload });
}

/**
 * Creates a radio group component for a modal label.
 */
export function radioGroup(
  options: Omit<RadioGroup, "type">,
): RadioGroupComponentData {
  return radioGroupToAPI({ ...options, type: ComponentType.RadioGroup });
}

/**
 * Creates a checkbox group component for a modal label.
 */
export function checkboxGroup(
  options: Omit<CheckboxGroup, "type">,
): CheckboxGroupComponentData {
  return checkboxGroupToAPI({ ...options, type: ComponentType.CheckboxGroup });
}

/**
 * Creates a checkbox component for a modal label.
 */
export function checkbox(
  options: Omit<Checkbox, "type">,
): CheckboxComponentData {
  return checkboxToAPI({ ...options, type: ComponentType.Checkbox });
}

/**
 * Creates a modal Label component.
 *
 * A Label wraps one interactive modal component such as a text input, select menu,
 * file upload, radio group, checkbox group, or checkbox.
 */
export function label(
  options: Omit<Label, "type">,
): LabelComponentData {
  return labelToAPI({ ...options, type: ComponentType.Label });
}

function isLegacyTextInput(
  input: Omit<LabeledTextInput, "type"> | TypedTextInput,
): input is Omit<LabeledTextInput, "type"> {
  return "label" in input && typeof input.label === "string";
}

function isModalTopLevelComponentInput(input: unknown): input is ModalTopLevelComponentInput {
  return (
    typeof input === "string"
    || (
      typeof input === "object"
      && input !== null
      && "type" in input
      && (input.type === ComponentType.Label || input.type === ComponentType.TextDisplay)
    )
  );
}

/**
 * Creates a modal payload.
 *
 * Components v2 modals accept Label and Text Display components at the top level.
 * Strings are converted to Text Display components, so short helper text can be
 * written inline.
 *
 * @example
 * ```ts
 * modal(
 *   "Profile",
 *   "profile-modal",
 *   "Update the fields below.",
 *   label({
 *     label: "Name",
 *     component: textInput({
 *       customId: "name",
 *       style: "short",
 *       required: true,
 *     }),
 *   }),
 * );
 * ```
 */
export function modal(
  title: string,
  customId: string,
  component: ModalTopLevelComponentInput,
  ...components: ModalTopLevelComponentInput[]
): ModalComponentData;
export function modal(
  title: string,
  customId: string,
  textInput: TypedTextInput,
): ModalComponentData;
export function modal(
  title: string,
  customId: string,
  textInput: Omit<LabeledTextInput, "type">,
  ...textInputs: Omit<LabeledTextInput, "type">[]
): ModalComponentData;
export function modal(
  title: string,
  customId: string,
  component: ModalTopLevelComponentInput | Omit<LabeledTextInput, "type"> | TypedTextInput,
  ...components: Array<ModalTopLevelComponentInput | Omit<LabeledTextInput, "type">>
): ModalComponentData {
  if (isModalTopLevelComponentInput(component)) {
    return {
      title,
      customId,
      components: [component, ...components as ModalTopLevelComponentInput[]].map((modalComponent) => {
        if (typeof modalComponent === "string") {
          return textDisplayToAPI(modalComponent);
        }

        if (modalComponent.type === ComponentType.Label) {
          return labelToAPI(modalComponent as Label);
        }

        return textDisplayToAPI(modalComponent as TextDisplayInput);
      }),
    };
  }

  let modalComponents: ActionRowData<TextInputComponentData>[];
  const legacyComponent = component as Omit<LabeledTextInput, "type"> | TypedTextInput;
  if (isLegacyTextInput(legacyComponent)) {
    const textInputs = [legacyComponent, ...components as Array<Omit<LabeledTextInput, "type">>];
    modalComponents = textInputs.map((input) => {
      return {
        type: ComponentType.ActionRow,
        components: [textInputToAPI({ ...input, type: ComponentType.TextInput })],
      };
    });
  }
  else {
    modalComponents = Object.keys(legacyComponent).map((key) => {
      return {
        type: ComponentType.ActionRow,
        components: [
          textInputToAPI({
            ...legacyComponent[key],
            customId: key,
            type: ComponentType.TextInput,
          }),
        ],
      };
    });
  }

  return {
    title,
    customId,
    components: modalComponents,
  };
}
