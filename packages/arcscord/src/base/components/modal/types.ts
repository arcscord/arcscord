import type { TextDisplayInput } from "@arcscord/components";
import type { ComponentType } from "discord-api-types/v10";
import type {
  ChannelSelectMenuBuilder,
  CheckboxComponentData,
  CheckboxGroupComponentData,
  FileUploadComponentData,
  LabelBuilder,
  LabelComponentData,
  MentionableSelectMenuBuilder,
  ModalBuilder,
  RadioGroupComponentData,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextDisplayComponentData,
  TextInputBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import type {
  ComponentInLabel,
  FileUpload,
  ModalLabelOverrides,
  ModalTopLevelComponent,
  StringSelectMenu,
  TextInput,
} from "../shared/component_definer.type";

export type { ModalLabelOverrides } from "../shared/component_definer.type";

/** A discord.js builder accepted at the top level of a modal (`LabelBuilder` or `ModalBuilder`). */
export type DiscordModalTopLevelBuilder
  = | LabelBuilder
    | ModalBuilder;

type DiscordModalFieldBuilder
  = | ChannelSelectMenuBuilder
    | MentionableSelectMenuBuilder
    | RoleSelectMenuBuilder
    | StringSelectMenuBuilder
    | TextInputBuilder
    | UserSelectMenuBuilder;

/**
 * Any value accepted as a top-level component when building a modal: an arcscord definition,
 * raw component data, text input, or a {@link DiscordModalTopLevelBuilder}.
 */
export type ModalTopLevelComponentInput
  = | ModalTopLevelComponent
    | LabelComponentData
    | TextDisplayComponentData
    | TextDisplayInput
    | DiscordModalTopLevelBuilder;

export type ModalFieldComponentInput
  = | ComponentInLabel
    | CheckboxComponentData
    | CheckboxGroupComponentData
    | FileUploadComponentData
    | RadioGroupComponentData
    | DiscordModalFieldBuilder;

/** Options passed to {@link buildModal}: the modal `title`, its `customId`, and its top-level `components`. */
export type BuildModalOptions = {
  title: string;
  customId: string;
  components: ModalTopLevelComponentInput[];
};

export type TextInputFieldOptions<Required extends boolean | undefined> = Omit<
  TextInput,
  "customId" | "label" | "style" | "type"
> & {
  required?: Required;
  style?: TextInput["style"];
};

export type SelectFieldOptions<Required extends boolean | undefined> = Omit<
  StringSelectMenu<"modal">,
  "customId" | "maxValues" | "options" | "type"
> & {
  maxValues?: 1;
  options: readonly string[];
  required?: Required;
};

export type MultiSelectFieldOptions<
  Options extends readonly string[],
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = Omit<
  StringSelectMenu<"modal">,
  "customId" | "maxValues" | "options" | "type"
> & {
  maxValues: MaxValues;
  options: Options;
  required?: Required;
};

export type NativeSelectFieldOptions<
  Select extends { maxValues?: number; required?: boolean },
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = Omit<Select, "customId" | "maxValues" | "type"> & {
  maxValues?: MaxValues;
  required?: Required;
};

export type FileUploadFieldOptions<
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
> = Omit<FileUpload, "customId" | "maxValues" | "type"> & {
  maxValues?: MaxValues;
  required?: Required;
};

/**
 * Shared label options for a modal field wrapped by {@link modalLabel}: the required
 * `label` and an optional `description`.
 */
export type LabeledFieldOptions = {
  description?: string;
  label: string;
};

/**
 * Per-option display-text override (keyed by option value). `value` is never
 * overridable — only what the user sees.
 */
export type ModalOptionOverride = {
  readonly label?: string;
  readonly description?: string;
};

/**
 * Display-text overrides for a `modalTextInput` field's `label()`.
 */
export type ModalTextInputOverrides = ModalLabelOverrides & {
  readonly placeholder?: string;
  readonly value?: string;
};

/**
 * Display-text overrides for native select fields
 * (user / role / mentionable / channel).
 */
export type ModalNativeSelectOverrides = ModalLabelOverrides & {
  readonly placeholder?: string;
};

/**
 * Display-text overrides for a `modalStringSelect` field's `label()`.
 *
 * Option overrides are keyed by the declared option string (which is also the
 * value), so they stay in sync with the field's inferred `Value` type.
 */
export type ModalStringSelectOverrides<Options extends readonly string[]> = ModalLabelOverrides & {
  readonly placeholder?: string;
  readonly options?: {
    readonly [V in Options[number]]?: ModalOptionOverride;
  };
};

/**
 * Display-text overrides for radio / checkbox group fields' `label()`.
 *
 * Option overrides are keyed by the declared option `value`.
 */
export type ModalGroupOverrides<Options extends readonly { value: string }[]> = ModalLabelOverrides & {
  readonly options?: {
    readonly [V in Options[number]["value"]]?: ModalOptionOverride;
  };
};

export type CollectionLike<T> = {
  get?: (key: string) => T | undefined;
  values?: () => IterableIterator<T>;
};

export type ModalDataLike = {
  attachments?: CollectionLike<unknown>;
  channels?: CollectionLike<unknown>;
  roles?: CollectionLike<unknown>;
  type?: ComponentType;
  users?: CollectionLike<unknown>;
  value?: unknown;
  values?: readonly unknown[];
};
