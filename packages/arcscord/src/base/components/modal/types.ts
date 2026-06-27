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
  ModalTopLevelComponent,
  StringSelectMenu,
  TextDisplayInput,
  TextInput,
} from "../shared/component_definer.type";

export type DiscordModalTopLevelBuilder
  = | LabelBuilder
    | ModalBuilder;

export type DiscordModalFieldBuilder
  = | ChannelSelectMenuBuilder
    | MentionableSelectMenuBuilder
    | RoleSelectMenuBuilder
    | StringSelectMenuBuilder
    | TextInputBuilder
    | UserSelectMenuBuilder;

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

export type LabeledFieldOptions = {
  description?: string;
  label: string;
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
