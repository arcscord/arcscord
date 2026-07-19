import type {
  ContainerChild,
  ContainerComponentInput,
  FileComponentInput,
  MediaGalleryComponentInput,
  MessageV2Child,
  MessageV2Component,
  SectionComponentInput,
  SeparatorComponentInput,
  TextDisplayInput,
  ThumbnailInput,
} from "@arcscord/components";
import type { ButtonStyle, ComponentType } from "discord-api-types/v10";
import type {
  Attachment,
  ChannelSelectMenuComponentData,
  CheckboxComponentData,
  CheckboxGroupComponentData,
  CheckboxGroupOption,
  ComponentEmojiResolvable,
  ComponentInLabelData,
  FileUploadComponentData,
  GuildBasedChannel,
  LabelComponentData,
  MentionableSelectMenuComponentData,
  RadioGroupComponentData,
  RadioGroupOption,
  Role,
  RoleSelectMenuComponentData,
  StringSelectMenuComponentData,
  TextDisplayComponentData,
  TextInputComponentData,
  User,
  UserSelectMenuComponentData,
} from "discord.js";
import type {
  buttonColorEnum,
  buttonStyleEnum,
  componentHandlerTypeEnum,
  componentTypesEnum,
  separatorSpacingSizeEnum,
  textInputStyleEnum,
} from "#/base/components/shared/component.enum";
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

/** Where a component definition is used: at the top level of a `"message"` or inside a `"modal"`. */
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
 * Presentation-only overrides for an option of a typed string select menu.
 *
 * The option value is intentionally excluded so the keys declared in
 * {@link TypedSelectMenuOptions} remain the source of truth for typing and
 * runtime validation.
 */
export type TypedSelectMenuOptionOverride = Partial<Omit<SelectOptions, "value">>;

/**
 * Per-option presentation overrides keyed by the values declared on a typed
 * string select menu.
 */
export type TypedSelectMenuOptionOverrides<Values extends TypedSelectMenuOptions> = {
  readonly [Value in keyof Values]?: TypedSelectMenuOptionOverride;
};

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
export type StringSelectMenuValues<
  T extends TypedSelectMenuOptions,
  MaxValues extends number | undefined = number | undefined,
> = MaxValues extends 1
  ? Extract<keyof T, string>
  : Array<Extract<keyof T, string>>;

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

/** A {@link SelectMenu} narrowed to the `"message"` usage. */
export type MessageSelectMenu = SelectMenu<"message">;
/** A {@link SelectMenu} narrowed to the `"modal"` usage. */
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

/** @deprecated Use {@link MessageV2Component} instead. */
export type AnyMessageTopLevelComponentData = MessageV2Component;

/** @deprecated Use {@link ContainerChild} instead. */
export type ComponentInContainer = ContainerChild;

/** @deprecated Use {@link ContainerComponentInput} instead. */
export type Container = ContainerComponentInput;

/** @deprecated Use {@link FileComponentInput} instead. */
export type File = FileComponentInput;

/** @deprecated Use {@link MediaGalleryComponentInput} instead. */
export type MediaGallery = MediaGalleryComponentInput;

/** @deprecated Use {@link MessageV2Child} instead. */
export type MessageTopLevelComponent = MessageV2Child;

/** @deprecated Use {@link SectionComponentInput} instead. */
export type Section = SectionComponentInput;

/** @deprecated Use {@link SeparatorComponentInput} instead. */
export type Separator = SeparatorComponentInput;

/** @deprecated Use {@link TextDisplayInput} instead. */
export type TextDisplay = TextDisplayInput;

/** @deprecated Use {@link ThumbnailInput} instead. */
export type Thumbnail = ThumbnailInput;

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
    | Checkbox
    | ComponentInLabelData;

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
export type ModalTopLevelComponent = Label | TextDisplayInput;

/** Union of every resolved component data type allowed inside a modal. */
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

/**
 * Runtime input provided to modal field parsers.
 */
export type ModalFieldParseInput = {
  readonly customId: string;
  readonly field: unknown;
  readonly value: unknown;
};

/**
 * Base display-text overrides accepted by every modal field's `label()`.
 *
 * Only visible text can be overridden at build time (for i18next / variable
 * values). Option `value`s are never overridable — they drive the inferred
 * `Value` type and the runtime `parse` validation.
 */
export type ModalLabelOverrides = {
  readonly label?: string;
  readonly description?: string;
};

/**
 * Field definition used by typed modal handlers.
 */
export type ModalFieldDefinition<Value = unknown, Overrides = ModalLabelOverrides> = {
  readonly __modalField: true;
  /** Builds the label component data for the field, optionally applying `overrides`. */
  readonly label: (overrides?: Overrides) => LabelComponentData;
  /** Parses the submitted raw input into the field's typed `Value`. */
  readonly parse: (input: ModalFieldParseInput) => Value;
  /** Returns a copy of the field definition bound to the given `customId`. */
  readonly withCustomId: (customId: string) => ModalFieldDefinition<Value, Overrides>;
};

/**
 * Modal field definition map.
 */
export type ModalFields = Record<string, ModalFieldDefinition<any, any>>;

/**
 * Values inferred from a modal field definition map.
 */
export type ModalFieldValues<Fields extends ModalFields> = {
  readonly [K in keyof Fields]: Fields[K] extends ModalFieldDefinition<infer Value, any>
    ? Value
    : never;
};

/**
 * Value inferred from a modal string select.
 */
export type ModalStringSelectValue<
  Options extends readonly string[],
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = MaxValues extends 1 | undefined
  ? Required extends false
    ? Options[number] | undefined
    : Options[number]
  : Required extends false
    ? Options[number][] | undefined
    : Options[number][];

/**
 * Resolves the value type produced by a modal select field.
 *
 * A single value (or `Value | undefined` when optional) when `MaxValues` is `1`
 * or unset, otherwise an array (or `Value[] | undefined` when optional).
 *
 * @typeParam Value - The resolved element type (e.g. `User`, `Role`, `Attachment`).
 * @typeParam MaxValues - The field's maximum selectable values.
 * @typeParam Required - Whether the field is required.
 */
export type ModalSelectableValue<
  Value,
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = MaxValues extends 1 | undefined
  ? Required extends false
    ? Value | undefined
    : Value
  : Required extends false
    ? Value[] | undefined
    : Value[];

/** Parsed value of a modal user-select field: resolved `User`(s), shaped by {@link ModalSelectableValue}. */
export type ModalUserSelectValue<
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = ModalSelectableValue<User, MaxValues, Required>;

/** Parsed value of a modal role-select field: resolved `Role`(s), shaped by {@link ModalSelectableValue}. */
export type ModalRoleSelectValue<
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = ModalSelectableValue<Role, MaxValues, Required>;

/** Parsed value of a modal mentionable-select field: resolved `User | Role`(s), shaped by {@link ModalSelectableValue}. */
export type ModalMentionableSelectValue<
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = ModalSelectableValue<User | Role, MaxValues, Required>;

/** Parsed value of a modal channel-select field: resolved `GuildBasedChannel`(s), shaped by {@link ModalSelectableValue}. */
export type ModalChannelSelectValue<
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = ModalSelectableValue<GuildBasedChannel, MaxValues, Required>;

/** Parsed value of a modal file-upload field: uploaded `Attachment`(s), shaped by {@link ModalSelectableValue}. */
export type ModalFileUploadValue<
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = ModalSelectableValue<Attachment, MaxValues, Required>;

/** Parsed value of a modal radio group: the selected option's `value`, or `undefined` when optional. */
export type ModalRadioGroupValue<
  Options extends readonly { value: string }[],
  Required extends boolean | undefined,
> = Required extends false ? Options[number]["value"] | undefined : Options[number]["value"];

/** Parsed value of a modal checkbox group: the array of selected option `value`s. */
export type ModalCheckboxGroupValue<
  Options extends readonly { value: string }[],
> = Array<Options[number]["value"]>;
