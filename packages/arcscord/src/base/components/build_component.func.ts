import type {
  ActionRowData,
  ButtonComponentData,
  ChannelSelectMenuComponentData,
  CheckboxComponentData,
  CheckboxGroupComponentData,
  ComponentEmojiResolvable,
  ContainerComponentData,
  FileComponentData,
  FileUploadComponentData,
  LabelComponentData,
  MediaGalleryComponentData,
  MentionableSelectMenuComponentData,
  ModalComponentData,
  RadioGroupComponentData,
  RoleSelectMenuComponentData,
  SectionComponentData,
  SeparatorComponentData,
  StringSelectMenuComponentData,
  TextDisplayComponentData,
  TextInputComponentData,
  ThumbnailComponentData,
  UserSelectMenuComponentData,
} from "discord.js";
import type { Button } from "#/base";
import type {
  ChannelSelectMenu,
  Checkbox,
  CheckboxGroup,
  ClickableButton,
  Container,
  File,
  FileUpload,
  Label,
  LabeledTextInput,
  LinkButton,
  MediaGallery,
  MentionableSelectMenu,
  PremiumButton,
  RadioGroup,
  RoleSelectMenu,
  Section,
  Separator,
  StringSelectMenu,
  TextDisplay,
  TextInput,
  Thumbnail,
  TypedTextInput,
  UserSelectMenu,
} from "#/base/components/component_definer.type";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import {
  buttonToAPI,
  checkboxGroupToAPI,
  checkboxToAPI,
  containerToAPI,
  fileToAPI,
  fileUploadToAPI,
  labelToAPI,
  mediaGalleryToAPI,
  radioGroupToAPI,
  sectionToAPI,
  selectMenuToAPI,
  separatorToAPI,
  textDisplayToAPI,
  textInputToAPI,
  thumbnailToAPI,
} from "#/base/components/build_component.util";

type ModalTopLevelComponentInput
  = | import("#/base/components/component_definer.type").ModalTopLevelComponent
    | LabelComponentData
    | TextDisplayComponentData;

/**
 * Build a link button
 * @param options options of link button
 * @example
 * ```ts
 * buildLinkButton({
 *   url: "https://discord.com",
 *   label: "Discord",
 * });
 * ```
 */
export function buildLinkButton(
  options: Omit<LinkButton, "type" | "style"> & { label: string },
): LinkButton;
/**
 * Build a link button
 * @param options options of link button
 * @example
 * ```ts
 * buildLinkButton({
 *   url: "https://discord.com",
 *   label: "Discord",
 * });
 * ```
 */
export function buildLinkButton(
  options: Omit<LinkButton, "type" | "style"> & { emoji: ComponentEmojiResolvable },
): LinkButton;

export function buildLinkButton(
  options: Omit<LinkButton, "type" | "style">,
): LinkButton {
  return {
    ...options,
    type: ComponentType.Button,
    style: ButtonStyle.Link,
  };
}

/**
 * Build a premium button.
 * @param options options of premium button
 */
export function buildPremiumButton(
  options: Omit<PremiumButton, "type" | "style">,
): PremiumButton {
  return {
    ...options,
    type: ComponentType.Button,
    style: ButtonStyle.Premium,
  };
}

/**
 * Build a clickable button
 * @param options options of the clickable button
 * @example
 * ```ts
 * buildClickableButton({
 *   style: "primary",
 *   label: "Click here",
 *   customId: "Yeah",
 *   emoji: "❤️",
 * });
 * ```
 */
export function buildClickableButton(
  options: Omit<ClickableButton, "type"> & { label: string },
): ClickableButton;
/**
 * Build a clickable button
 * @param options options of the clickable button
 * @example
 * ```ts
 * buildClickableButton({
 *   style: "primary",
 *   label: "Click here",
 *   customId: "Yeah",
 *   emoji: "❤️",
 * });
 * ```
 */
export function buildClickableButton(
  options: Omit<ClickableButton, "type"> & { emoji: ComponentEmojiResolvable },
): ClickableButton;

export function buildClickableButton(
  options: Omit<ClickableButton, "type">,
): ClickableButton {
  return {
    ...options,
    type: ComponentType.Button,
  };
}

type ButtonList
  = | [Button]
    | [Button, Button]
    | [Button, Button, Button]
    | [Button, Button, Button, Button]
    | [Button, Button, Button, Button, Button];

/**
 * Make an actionRow of buttons
 * @param buttons buttons list
 */
export function buildButtonActionRow(
  ...buttons: ButtonList
): ActionRowData<ButtonComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: buttons.map(button => buttonToAPI(button)),
  };
}

/**
 * Build a string select menu
 * @param options options of the string select menu
 * @example
 * ```ts
 * buildStringSelectMenu({
 *   customId: "select-1",
 *   options: [
 *     { label: "Option 1", value: "1" },
 *     { label: "Option 2", value: "2" },
 *   ],
 *   placeholder: "Choose an option",
 *   minValues: 1,
 *   maxValues: 1,
 * });
 * ```
 */
export function buildStringSelectMenu(
  options: Omit<StringSelectMenu<"message">, "type">,
): ActionRowData<StringSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI({
        ...options,
        type: ComponentType.StringSelect,
      }) as StringSelectMenuComponentData,
    ],
  };
}

/**
 * Build a user select menu
 * @param option options of the user select menu
 * @example
 * ```ts
 * buildUserSelectMenu({
 *   customId: "user-select-1",
 * });
 * ```
 */
export function buildUserSelectMenu(
  option: Omit<UserSelectMenu<"message">, "type">,
): ActionRowData<UserSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI({
        ...option,
        type: ComponentType.UserSelect,
      }) as UserSelectMenuComponentData,
    ],
  };
}

/**
 * Build a role select menu
 * @param option options of the role select menu
 * @example
 * ```ts
 * buildRoleSelectMenu({
 *   customId: "role-select-1",
 *   placeholder: "Select a role",
 *   maxValues: 25,
 * });
 * ```
 */
export function buildRoleSelectMenu(
  option: Omit<RoleSelectMenu<"message">, "type">,
): ActionRowData<RoleSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI({
        ...option,
        type: ComponentType.RoleSelect,
      }) as RoleSelectMenuComponentData,
    ],
  };
}

/**
 * Build a mentionable select menu
 * @param option options of the mentionable select menu
 * @example
 * ```ts
 * buildMentionableSelectMenu({
 *   customId: "mention-select-1",
 *   defaultValues: [
 *     {
 *       id: "858220958378441754",
 *       type: "user",
 *     },
 *   ],
 * });
 * ```
 */
export function buildMentionableSelectMenu(
  option: Omit<MentionableSelectMenu<"message">, "type">,
): ActionRowData<MentionableSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI({
        ...option,
        type: ComponentType.MentionableSelect,
      }) as MentionableSelectMenuComponentData,
    ],
  };
}

/**
 * Build a channel select menu
 * @param option options of the channel select menu
 * @example
 * ```ts
 * buildChannelSelectMenu({
 *   customId: "channel-select-1",
 *   placeholder: "Select a channel",
 *   channelTypes: ["guildText", "guildVoice"],
 * });
 * ```
 */
export function buildChannelSelectMenu(
  option: Omit<ChannelSelectMenu<"message">, "type">,
): ActionRowData<ChannelSelectMenuComponentData> {
  return {
    type: ComponentType.ActionRow,
    components: [
      selectMenuToAPI({
        ...option,
        type: ComponentType.ChannelSelect,
      }) as ChannelSelectMenuComponentData,
    ],
  };
}

/**
 * Build a string select menu component for a modal label.
 */
export function buildStringSelectModalComponent(
  options: Omit<StringSelectMenu<"modal">, "type">,
): StringSelectMenuComponentData {
  return selectMenuToAPI({
    ...options,
    type: ComponentType.StringSelect,
  }) as StringSelectMenuComponentData;
}

/**
 * Build a user select menu component for a modal label.
 */
export function buildUserSelectModalComponent(
  option: Omit<UserSelectMenu<"modal">, "type">,
): UserSelectMenuComponentData {
  return selectMenuToAPI({
    ...option,
    type: ComponentType.UserSelect,
  }) as UserSelectMenuComponentData;
}

/**
 * Build a role select menu component for a modal label.
 */
export function buildRoleSelectModalComponent(
  option: Omit<RoleSelectMenu<"modal">, "type">,
): RoleSelectMenuComponentData {
  return selectMenuToAPI({
    ...option,
    type: ComponentType.RoleSelect,
  }) as RoleSelectMenuComponentData;
}

/**
 * Build a mentionable select menu component for a modal label.
 */
export function buildMentionableSelectModalComponent(
  option: Omit<MentionableSelectMenu<"modal">, "type">,
): MentionableSelectMenuComponentData {
  return selectMenuToAPI({
    ...option,
    type: ComponentType.MentionableSelect,
  }) as MentionableSelectMenuComponentData;
}

/**
 * Build a channel select menu component for a modal label.
 */
export function buildChannelSelectModalComponent(
  option: Omit<ChannelSelectMenu<"modal">, "type">,
): ChannelSelectMenuComponentData {
  return selectMenuToAPI({
    ...option,
    type: ComponentType.ChannelSelect,
  }) as ChannelSelectMenuComponentData;
}

/**
 * Build a text input component for a modal label or legacy action row.
 */
export function buildTextInput(
  options: Omit<TextInput, "type">,
): TextInputComponentData {
  return textInputToAPI({ ...options, type: ComponentType.TextInput });
}

/**
 * Build a text display component.
 */
export function buildTextDisplay(
  options: Omit<TextDisplay, "type">,
): TextDisplayComponentData {
  return textDisplayToAPI({ ...options, type: ComponentType.TextDisplay });
}

/**
 * Build a thumbnail component.
 */
export function buildThumbnail(
  options: Omit<Thumbnail, "type">,
): ThumbnailComponentData {
  return thumbnailToAPI({ ...options, type: ComponentType.Thumbnail });
}

/**
 * Build a section component.
 */
export function buildSection(
  options: Omit<Section, "type">,
): SectionComponentData {
  return sectionToAPI({ ...options, type: ComponentType.Section });
}

/**
 * Build a media gallery component.
 */
export function buildMediaGallery(
  options: Omit<MediaGallery, "type">,
): MediaGalleryComponentData {
  return mediaGalleryToAPI({ ...options, type: ComponentType.MediaGallery });
}

/**
 * Build a file component.
 */
export function buildFile(
  options: Omit<File, "type">,
): FileComponentData {
  return fileToAPI({ ...options, type: ComponentType.File });
}

/**
 * Build a separator component.
 */
export function buildSeparator(
  options: Omit<Separator, "type"> = {},
): SeparatorComponentData {
  return separatorToAPI({ ...options, type: ComponentType.Separator });
}

/**
 * Build a container component.
 */
export function buildContainer(
  options: Omit<Container, "type">,
): ContainerComponentData {
  return containerToAPI({ ...options, type: ComponentType.Container });
}

/**
 * Build a file upload component for a modal label.
 */
export function buildFileUpload(
  options: Omit<FileUpload, "type">,
): FileUploadComponentData {
  return fileUploadToAPI({ ...options, type: ComponentType.FileUpload });
}

/**
 * Build a radio group component for a modal label.
 */
export function buildRadioGroup(
  options: Omit<RadioGroup, "type">,
): RadioGroupComponentData {
  return radioGroupToAPI({ ...options, type: ComponentType.RadioGroup });
}

/**
 * Build a checkbox group component for a modal label.
 */
export function buildCheckboxGroup(
  options: Omit<CheckboxGroup, "type">,
): CheckboxGroupComponentData {
  return checkboxGroupToAPI({ ...options, type: ComponentType.CheckboxGroup });
}

/**
 * Build a checkbox component for a modal label.
 */
export function buildCheckbox(
  options: Omit<Checkbox, "type">,
): CheckboxComponentData {
  return checkboxToAPI({ ...options, type: ComponentType.Checkbox });
}

/**
 * Build a label component for modals.
 */
export function buildLabel(
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
    typeof input === "object"
    && input !== null
    && "type" in input
    && (input.type === ComponentType.Label || input.type === ComponentType.TextDisplay)
  );
}

/**
 * Build a modal.
 * @param title - The title of the modal
 * @param customId - The custom ID of the modal
 * @param component - A components v2 top-level modal component, or legacy text input data
 * @param components - Additional modal components
 * @example
 * ```ts
 * buildModal(
 *   "Profile",
 *   "profile-modal",
 *   buildLabel({
 *     label: "Name",
 *     component: buildTextInput({
 *       customId: "name",
 *       style: "short",
 *       required: true,
 *     }),
 *   }),
 * )
 * ```
 */
export function buildModal(
  title: string,
  customId: string,
  component: ModalTopLevelComponentInput,
  ...components: ModalTopLevelComponentInput[]
): ModalComponentData;
export function buildModal(
  title: string,
  customId: string,
  textInput: TypedTextInput,
): ModalComponentData;
export function buildModal(
  title: string,
  customId: string,
  textInput: Omit<LabeledTextInput, "type">,
  ...textInputs: Omit<LabeledTextInput, "type">[]
): ModalComponentData;
export function buildModal(
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
        if (modalComponent.type === ComponentType.Label) {
          return labelToAPI(modalComponent as import("#/base/components/component_definer.type").Label);
        }
        return textDisplayToAPI(modalComponent as import("#/base/components/component_definer.type").TextDisplay);
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
