import type { ButtonStyle, ComponentType, SeparatorSpacingSize } from "discord-api-types/v10";
import type {
  ChannelSelectMenuComponentData,
  CheckboxComponentData,
  CheckboxGroupComponentData,
  CheckboxGroupOption,
  ComponentEmojiResolvable,
  ContainerComponentData,
  FileComponentData,
  FileUploadComponentData,
  LabelComponentData,
  MediaGalleryComponentData,
  MediaGalleryItemData,
  MentionableSelectMenuComponentData,
  RadioGroupComponentData,
  RadioGroupOption,
  RoleSelectMenuComponentData,
  SectionComponentData,
  SeparatorComponentData,
  StringSelectMenuComponentData,
  TextDisplayComponentData,
  TextInputComponentData,
  UnfurledMediaItemData,
  UserSelectMenuComponentData,
} from "discord.js";
import type {
  buttonColorEnum,
  buttonStyleEnum,
  componentHandlerTypeEnum,
  componentTypesEnum,
  separatorSpacingSizeEnum,
  textInputStyleEnum,
} from "#/base/components/component.enum";
import type { ChannelType } from "#/utils/discord/type/channel.type";

/**
 * Type for Discord component types by name
 * [Discord Docs](https://discord.com/developers/docs/interactions/message-components#component-object-component-types).
 */
export type StringComponentType = keyof typeof componentTypesEnum;

/**
 * Type for component handler kinds.
 */
export type ComponentHandlerType = typeof componentHandlerTypeEnum[keyof typeof componentHandlerTypeEnum];

/**
 * Type for Discord button styles by name.
 * @see [Discord Docs](https://discord.com/developers/docs/interactions/message-components#button-object-button-styles)
 */
export type StringButtonStyle = keyof typeof buttonStyleEnum;

/**
 * Type for renamed button styles by color.
 */
export type StringButtonColor = keyof typeof buttonColorEnum;

/**
 * Type for Discord separator spacing sizes by name.
 */
export type StringSeparatorSpacingSize = keyof typeof separatorSpacingSizeEnum;

/**
 * Component types that can be interacted with from a message.
 */
export type MessageComponentType
  = | ComponentType.Button
    | ComponentType.StringSelect
    | ComponentType.UserSelect
    | ComponentType.RoleSelect
    | ComponentType.MentionableSelect
    | ComponentType.ChannelSelect;

/**
 * Component types that can be submitted from a modal.
 */
export type ModalComponentType
  = | ComponentType.TextInput
    | ComponentType.StringSelect
    | ComponentType.UserSelect
    | ComponentType.RoleSelect
    | ComponentType.MentionableSelect
    | ComponentType.ChannelSelect
    | ComponentType.FileUpload
    | ComponentType.RadioGroup
    | ComponentType.CheckboxGroup
    | ComponentType.Checkbox;

/**
 * Component types shared by message and modal contexts.
 */
export type SelectMenuComponentType
  = | ComponentType.StringSelect
    | ComponentType.UserSelect
    | ComponentType.RoleSelect
    | ComponentType.MentionableSelect
    | ComponentType.ChannelSelect;

export type ComponentUsage = "message" | "modal";

type SelectMenuUsageOptions<Usage extends ComponentUsage>
  = Usage extends "modal"
    ? {
        /**
         * Whether the select menu is required to answer in a modal.
         */
        readonly required?: boolean;
        readonly disabled?: never;
      }
    : {
        /**
         * Whether the select menu is disabled in a message.
         */
        readonly disabled?: boolean;
        readonly required?: never;
      };

/**
 * Base type for a UI component.
 */
export type BaseComponent = {
  readonly type: ComponentType;
  readonly id?: number;
};

/**
 * Base type for a button component.
 */
export type BaseButton = BaseComponent & {
  readonly type: ComponentType.Button;
  readonly label?: string;
  readonly emoji?: ComponentEmojiResolvable;
  readonly disabled?: boolean;
};

/**
 * Type for a clickable button.
 */
export type ClickableButton = BaseButton & {
  readonly style: Exclude<StringButtonStyle, "link" | "premium"> | StringButtonColor | Exclude<ButtonStyle, ButtonStyle.Link | ButtonStyle.Premium>;
  readonly customId: string;
};

/**
 * Type for a link button.
 */
export type LinkButton = BaseButton & {
  readonly style: Extract<StringButtonStyle, "link"> | ButtonStyle.Link;
  readonly url: string;
};

/**
 * Type for a premium button.
 */
export type PremiumButton = BaseButton & {
  readonly style: Extract<StringButtonStyle, "premium"> | ButtonStyle.Premium;
  readonly skuId: string;
  readonly label?: never;
  readonly emoji?: never;
  readonly customId?: never;
  readonly url?: never;
};

/**
 * Union type for all button variants.
 */
export type Button = LinkButton | ClickableButton | PremiumButton;

/**
 * Base type for a select menu component.
 */
export type BaseSelectMenu<Usage extends ComponentUsage = ComponentUsage> = BaseComponent & SelectMenuUsageOptions<Usage> & {
  readonly type: SelectMenuComponentType;
  readonly customId: string;
  readonly minValues?: number;
  readonly maxValues?: number;
  readonly placeholder?: string;
};

/**
 * Type for the possible select menu default value types.
 */
export type SelectMenuDefaultValueType = "user" | "role" | "channel";

/**
 * Type for select menu default values.
 * @template AllowedType The allowed types for the default value.
 */
export type SelectMenuDefaultValue<
  AllowedType extends SelectMenuDefaultValueType,
> = {
  readonly id: string;
  readonly type: AllowedType;
};

/**
 * Type for select menu options.
 */
export type SelectOptions = {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly emoji?: ComponentEmojiResolvable;
  readonly default?: boolean;
};

/**
 * Type for typed select menu options.
 */
export type TypedSelectMenuOptions = Record<
  string,
  Omit<SelectOptions, "value"> | string
>;

/**
 * Type for a string select menu.
 */
export type StringSelectMenu<Usage extends ComponentUsage = ComponentUsage> = BaseSelectMenu<Usage> & {
  readonly type: ComponentType.StringSelect;
  readonly options: SelectOptions[] | string[] | TypedSelectMenuOptions;
};

/**
 * @internal
 */
export type StringSelectMenuValues<T extends TypedSelectMenuOptions>
  = (keyof T)[];

/**
 * Type for a user select menu.
 */
export type UserSelectMenu<Usage extends ComponentUsage = ComponentUsage> = BaseSelectMenu<Usage> & {
  readonly type: ComponentType.UserSelect;
  readonly defaultValues?: SelectMenuDefaultValue<"user">[];
};

/**
 * Type for a role select menu.
 */
export type RoleSelectMenu<Usage extends ComponentUsage = ComponentUsage> = BaseSelectMenu<Usage> & {
  readonly type: ComponentType.RoleSelect;
  readonly defaultValues?: SelectMenuDefaultValue<"role">[];
};

/**
 * Type for a mentionable select menu.
 */
export type MentionableSelectMenu<Usage extends ComponentUsage = ComponentUsage> = BaseSelectMenu<Usage> & {
  readonly type: ComponentType.MentionableSelect;
  readonly defaultValues?: SelectMenuDefaultValue<"user" | "role">[];
};

/**
 * Type for a channel select menu.
 */
export type ChannelSelectMenu<Usage extends ComponentUsage = ComponentUsage> = BaseSelectMenu<Usage> & {
  readonly type: ComponentType.ChannelSelect;
  readonly defaultValues?: SelectMenuDefaultValue<"channel">[];
  readonly channelTypes?: ChannelType[];
};

/**
 * Union type for all select menu variants.
 */
export type SelectMenu<Usage extends ComponentUsage = ComponentUsage>
  = | UserSelectMenu<Usage>
    | RoleSelectMenu<Usage>
    | MentionableSelectMenu<Usage>
    | ChannelSelectMenu<Usage>
    | StringSelectMenu<Usage>;

export type MessageSelectMenu = SelectMenu<"message">;
export type ModalSelectMenu = SelectMenu<"modal">;

/**
 * Union type for all select menu component data types.
 */
export type AnySelectMenuComponentData
  = | StringSelectMenuComponentData
    | UserSelectMenuComponentData
    | RoleSelectMenuComponentData
    | MentionableSelectMenuComponentData
    | ChannelSelectMenuComponentData;

/**
 * Type for a text display component.
 */
export type TextDisplay = BaseComponent & {
  readonly type: ComponentType.TextDisplay;
  readonly content: string;
};

/**
 * Type for a thumbnail component.
 */
export type Thumbnail = BaseComponent & {
  readonly type: ComponentType.Thumbnail;
  readonly media: UnfurledMediaItemData;
  readonly description?: string;
  readonly spoiler?: boolean;
};

/**
 * Type for a section component.
 */
export type Section = BaseComponent & {
  readonly type: ComponentType.Section;
  readonly components: TextDisplay[];
  readonly accessory: Button | Thumbnail;
};

/**
 * Type for a media gallery component.
 */
export type MediaGallery = BaseComponent & {
  readonly type: ComponentType.MediaGallery;
  readonly items: readonly MediaGalleryItemData[];
};

/**
 * Type for a file component.
 */
export type File = BaseComponent & {
  readonly type: ComponentType.File;
  readonly file: UnfurledMediaItemData;
  readonly spoiler?: boolean;
};

/**
 * Type for a separator component.
 */
export type Separator = BaseComponent & {
  readonly type: ComponentType.Separator;
  readonly divider?: boolean;
  readonly spacing?: StringSeparatorSpacingSize | SeparatorSpacingSize;
};

/**
 * Components allowed inside a container.
 */
export type ComponentInContainer
  = | ReturnType<typeof import("#/base/components/build_component.func").buildButtonActionRow>
    | File
    | MediaGallery
    | Section
    | Separator
    | TextDisplay;

/**
 * Type for a container component.
 */
export type Container = BaseComponent & {
  readonly type: ComponentType.Container;
  readonly components: readonly ComponentInContainer[];
  readonly accentColor?: number | null;
  readonly spoiler?: boolean;
};

/**
 * Type for Discord text input styles by name.
 * @see [Discord Docs](https://discord.com/developers/docs/interactions/message-components#text-input-object-text-input-styles)
 */
export type TextInputStyle = keyof typeof textInputStyleEnum;

/**
 * Type for a text input component.
 */
export type TextInput = BaseComponent & {
  readonly type: ComponentType.TextInput;
  readonly customId: string;
  readonly style: TextInputStyle;
  readonly label?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly required?: boolean;
  readonly value?: string;
  readonly placeholder?: string;
};

/**
 * Type for a text input that carries its own label.
 *
 * @remarks Discord recommends using a Label component in new modals.
 */
export type LabeledTextInput = TextInput & {
  readonly label: string;
};

/**
 * Type for a file upload component in a modal.
 */
export type FileUpload = BaseComponent & {
  readonly type: ComponentType.FileUpload;
  readonly customId: string;
  readonly minValues?: number;
  readonly maxValues?: number;
  readonly required?: boolean;
};

/**
 * Type for a radio group component in a modal.
 */
export type RadioGroup = BaseComponent & {
  readonly type: ComponentType.RadioGroup;
  readonly customId: string;
  readonly options: readonly RadioGroupOption[];
  readonly required?: boolean;
};

/**
 * Type for a checkbox group component in a modal.
 */
export type CheckboxGroup = BaseComponent & {
  readonly type: ComponentType.CheckboxGroup;
  readonly customId: string;
  readonly options: readonly CheckboxGroupOption[];
  readonly minValues?: number;
  readonly maxValues?: number;
  readonly required?: boolean;
};

/**
 * Type for a checkbox component in a modal.
 */
export type Checkbox = BaseComponent & {
  readonly type: ComponentType.Checkbox;
  readonly customId: string;
  readonly default?: boolean;
};

/**
 * Components allowed in a modal label.
 */
export type ComponentInLabel
  = | TextInput
    | ModalSelectMenu
    | FileUpload
    | RadioGroup
    | CheckboxGroup
    | Checkbox;

/**
 * Type for a modal label component.
 */
export type Label = BaseComponent & {
  readonly type: ComponentType.Label;
  readonly label: string;
  readonly description?: string;
  readonly component: ComponentInLabel;
};

/**
 * Components allowed at the top level of a modal.
 */
export type ModalTopLevelComponent = Label | TextDisplay;

/**
 * Components allowed at the top level of a message using components v2.
 */
export type MessageTopLevelComponent
  = | ReturnType<typeof import("#/base/components/build_component.func").buildButtonActionRow>
    | Container
    | File
    | MediaGallery
    | Section
    | Separator
    | TextDisplay;

export type AnyMessageTopLevelComponentData
  = | ContainerComponentData
    | FileComponentData
    | MediaGalleryComponentData
    | SectionComponentData
    | SeparatorComponentData
    | TextDisplayComponentData;

export type AnyModalComponentData
  = | CheckboxComponentData
    | CheckboxGroupComponentData
    | FileUploadComponentData
    | LabelComponentData
    | RadioGroupComponentData
    | TextDisplayComponentData
    | TextInputComponentData
    | AnySelectMenuComponentData;

/**
 * Type for typed text input components.
 */
export type TypedTextInput = {
  readonly [Key: string]: Omit<TextInput, "customId" | "type">;
};

/**
 * @internal
 */
export type ModalValues<T extends TypedTextInput> = {
  readonly [K in keyof T]: T[K]["required"] extends true
    ? string
    : string | undefined;
};
