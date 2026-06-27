import type {
  LabelComponentData,
  ModalBuilder,
  ModalComponentData,
} from "discord.js";
import type {
  ChannelSelectMenu,
  Checkbox,
  CheckboxGroup,
  ComponentInLabel,
  Label,
  MentionableSelectMenu,
  ModalChannelSelectValue,
  ModalCheckboxGroupValue,
  ModalFieldDefinition,
  ModalFileUploadValue,
  ModalMentionableSelectValue,
  ModalRadioGroupValue,
  ModalRoleSelectValue,
  ModalStringSelectValue,
  ModalUserSelectValue,
  RadioGroup,
  RoleSelectMenu,
  TextDisplayInput,
  UserSelectMenu,
} from "../shared/component_definer.type";
import type {
  BuildModalOptions,
  FileUploadFieldOptions,
  LabeledFieldOptions,
  ModalFieldComponentInput,
  ModalTopLevelComponentInput,
  MultiSelectFieldOptions,
  NativeSelectFieldOptions,
  SelectFieldOptions,
  TextInputFieldOptions,
} from "./types";
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
import {
  collectionGet,
  readCheckboxGroupValue,
  readCheckboxValue,
  readFilesSingleOrMany,
  readOptionalTextInputValue,
  readRadioValue,
  readResolvedSingleOrMany,
  readSingleOrManyStrings,
  readTextInputValue,
} from "./value_parsers";

function hasToJSON(value: unknown): value is { toJSON: () => unknown } {
  return typeof value === "object" && value !== null && "toJSON" in value;
}

function hasType(value: unknown): value is { type: ComponentType } {
  return typeof value === "object" && value !== null && "type" in value;
}

function createModalField<Value>(
  options: LabeledFieldOptions,
  createComponent: (customId: string) => ModalFieldComponentInput,
  parse: ModalFieldDefinition<Value>["parse"],
): ModalFieldDefinition<Value> {
  const create = (customId: string): ModalFieldDefinition<Value> => ({
    __modalField: true,
    label: () => modalLabel({
      label: options.label,
      description: options.description,
      component: componentInLabelToData(createComponent(customId)),
    }),
    parse,
    withCustomId: create,
  });

  return create("");
}

function componentInLabelToData(component: ModalFieldComponentInput): ComponentInLabel {
  if (hasToJSON(component)) {
    return component.toJSON() as unknown as ComponentInLabel;
  }

  return component as ComponentInLabel;
}

function topLevelComponentToData(component: ModalTopLevelComponentInput): ModalComponentData["components"][number] {
  if (hasToJSON(component)) {
    const data = component.toJSON() as unknown as ModalComponentData | LabelComponentData;
    if ("components" in data && Array.isArray(data.components)) {
      throw new TypeError("buildModal components cannot include a ModalBuilder");
    }

    return data as ModalComponentData["components"][number];
  }

  if (typeof component === "string" || !hasType(component) || component.type === ComponentType.TextDisplay) {
    return textDisplayToAPI(component as TextDisplayInput);
  }

  return labelToAPI(component as Label);
}

/**
 * Creates a typed text input field for `createModal`.
 */
export function modalTextInput<const Required extends boolean | undefined = true>(
  options: TextInputFieldOptions<Required> & LabeledFieldOptions,
): ModalFieldDefinition<Required extends false ? string | undefined : string> {
  const { description: _description, label: _label, ...textInputOptions } = options;

  return createModalField(
    options,
    customId => textInputToAPI({
      ...textInputOptions,
      customId,
      required: textInputOptions.required,
      style: textInputOptions.style ?? "short",
      type: ComponentType.TextInput,
    }),
    options.required === false ? readOptionalTextInputValue : readTextInputValue,
  ) as ModalFieldDefinition<Required extends false ? string | undefined : string>;
}

/**
 * Creates a typed string select field for `createModal`.
 *
 * When `maxValues` is omitted or `1`, the parsed value is a single option.
 * When `maxValues` is greater than `1`, the parsed value is an array.
 */
export function modalStringSelect<
  const Options extends readonly string[],
  const Required extends boolean | undefined = true,
>(
  options: SelectFieldOptions<Required> & LabeledFieldOptions & { options: Options },
): ModalFieldDefinition<ModalStringSelectValue<Options, 1, Required>>;
export function modalStringSelect<
  const Options extends readonly string[],
  const MaxValues extends number,
  const Required extends boolean | undefined = true,
>(
  options: MultiSelectFieldOptions<Options, MaxValues, Required> & LabeledFieldOptions,
): ModalFieldDefinition<ModalStringSelectValue<Options, MaxValues, Required>>;
export function modalStringSelect<
  const Options extends readonly string[],
  const MaxValues extends number | undefined,
  const Required extends boolean | undefined = true,
>(
  options: (SelectFieldOptions<Required> | MultiSelectFieldOptions<Options, MaxValues, Required>) & LabeledFieldOptions,
): ModalFieldDefinition<ModalStringSelectValue<Options, MaxValues, Required>> {
  return createModalField(
    options,
    customId => selectMenuToAPI({
      ...options,
      customId,
      maxValues: options.maxValues ?? 1,
      options: [...options.options],
      type: ComponentType.StringSelect,
    }),
    input => readSingleOrManyStrings(input, ComponentType.StringSelect, {
      allowedValues: options.options,
      maxValues: options.maxValues,
      required: options.required,
    }),
  ) as ModalFieldDefinition<ModalStringSelectValue<Options, MaxValues, Required>>;
}

/**
 * Creates a typed user select field for `createModal`.
 */
export function modalUserSelect<
  const MaxValues extends number | undefined = 1,
  const Required extends boolean | undefined = true,
>(
  options: NativeSelectFieldOptions<UserSelectMenu<"modal">, MaxValues, Required> & LabeledFieldOptions,
): ModalFieldDefinition<ModalUserSelectValue<MaxValues, Required>> {
  return createModalField(
    options,
    customId => selectMenuToAPI({ ...options, customId, type: ComponentType.UserSelect }),
    input => readResolvedSingleOrMany(input, ComponentType.UserSelect, {
      maxValues: options.maxValues,
      readValues: (field, ids) => ids.map(id => collectionGet(field.users, id)),
      required: options.required,
    }) as ModalUserSelectValue<MaxValues, Required>,
  );
}

/**
 * Creates a typed role select field for `createModal`.
 */
export function modalRoleSelect<
  const MaxValues extends number | undefined = 1,
  const Required extends boolean | undefined = true,
>(
  options: NativeSelectFieldOptions<RoleSelectMenu<"modal">, MaxValues, Required> & LabeledFieldOptions,
): ModalFieldDefinition<ModalRoleSelectValue<MaxValues, Required>> {
  return createModalField(
    options,
    customId => selectMenuToAPI({ ...options, customId, type: ComponentType.RoleSelect }),
    input => readResolvedSingleOrMany(input, ComponentType.RoleSelect, {
      maxValues: options.maxValues,
      readValues: (field, ids) => ids.map(id => collectionGet(field.roles, id)),
      required: options.required,
    }) as ModalRoleSelectValue<MaxValues, Required>,
  );
}

/**
 * Creates a typed mentionable select field for `createModal`.
 */
export function modalMentionableSelect<
  const MaxValues extends number | undefined = 1,
  const Required extends boolean | undefined = true,
>(
  options: NativeSelectFieldOptions<MentionableSelectMenu<"modal">, MaxValues, Required> & LabeledFieldOptions,
): ModalFieldDefinition<ModalMentionableSelectValue<MaxValues, Required>> {
  return createModalField(
    options,
    customId => selectMenuToAPI({ ...options, customId, type: ComponentType.MentionableSelect }),
    input => readResolvedSingleOrMany(input, ComponentType.MentionableSelect, {
      maxValues: options.maxValues,
      readValues: (field, ids) => ids.map((id) => {
        return collectionGet(field.users, id) ?? collectionGet(field.roles, id);
      }),
      required: options.required,
    }) as ModalMentionableSelectValue<MaxValues, Required>,
  );
}

/**
 * Creates a typed channel select field for `createModal`.
 */
export function modalChannelSelect<
  const MaxValues extends number | undefined = 1,
  const Required extends boolean | undefined = true,
>(
  options: NativeSelectFieldOptions<ChannelSelectMenu<"modal">, MaxValues, Required> & LabeledFieldOptions,
): ModalFieldDefinition<ModalChannelSelectValue<MaxValues, Required>> {
  return createModalField(
    options,
    customId => selectMenuToAPI({ ...options, customId, type: ComponentType.ChannelSelect }),
    input => readResolvedSingleOrMany(input, ComponentType.ChannelSelect, {
      maxValues: options.maxValues,
      readValues: (field, ids) => ids.map(id => collectionGet(field.channels, id)),
      required: options.required,
    }) as ModalChannelSelectValue<MaxValues, Required>,
  );
}

/**
 * Creates a typed file upload field for `createModal`.
 */
export function modalFileUpload<
  const MaxValues extends number | undefined = 1,
  const Required extends boolean | undefined = true,
>(
  options: FileUploadFieldOptions<MaxValues, Required> & LabeledFieldOptions,
): ModalFieldDefinition<ModalFileUploadValue<MaxValues, Required>> {
  return createModalField(
    options,
    customId => fileUploadToAPI({ ...options, customId, type: ComponentType.FileUpload }),
    input => readFilesSingleOrMany(input, {
      maxValues: options.maxValues,
      required: options.required,
    }),
  );
}

/**
 * Creates a typed radio group field for `createModal`.
 */
export function modalRadioGroup<
  const Options extends readonly { label: string; value: string }[],
  const Required extends boolean | undefined = true,
>(
  options: Omit<RadioGroup, "customId" | "options" | "required" | "type"> & LabeledFieldOptions & {
    options: Options;
    required?: Required;
  },
): ModalFieldDefinition<ModalRadioGroupValue<Options, Required>> {
  return createModalField(
    options,
    customId => radioGroupToAPI({ ...options, customId, type: ComponentType.RadioGroup }),
    input => readRadioValue(input, {
      allowedValues: options.options,
      required: options.required,
    }),
  ) as ModalFieldDefinition<ModalRadioGroupValue<Options, Required>>;
}

/**
 * Creates a checkbox group field for `createModal`.
 */
export function modalCheckboxGroup<const Options extends readonly { label: string; value: string }[]>(
  options: Omit<CheckboxGroup, "customId" | "options" | "type"> & LabeledFieldOptions & { options: Options },
): ModalFieldDefinition<ModalCheckboxGroupValue<Options>> {
  return createModalField(
    options,
    customId => checkboxGroupToAPI({ ...options, customId, type: ComponentType.CheckboxGroup }),
    input => readCheckboxGroupValue(input, {
      allowedValues: options.options,
    }),
  ) as ModalFieldDefinition<ModalCheckboxGroupValue<Options>>;
}

/**
 * Creates a boolean checkbox field for `createModal`.
 */
export function modalCheckbox(options: Omit<Checkbox, "customId" | "type"> & LabeledFieldOptions): ModalFieldDefinition<boolean> {
  return createModalField(
    options,
    customId => checkboxToAPI({ ...options, customId, type: ComponentType.Checkbox }),
    readCheckboxValue,
  );
}

/**
 * Creates a modal Label component.
 */
export function modalLabel(
  options: Omit<Label, "type">,
): LabelComponentData {
  return labelToAPI({
    ...options,
    component: componentInLabelToData(options.component),
    type: ComponentType.Label,
  });
}

/**
 * Creates a modal payload.
 */
export function buildModal(options: BuildModalOptions): ModalComponentData;
export function buildModal(builder: ModalBuilder): ModalComponentData;
export function buildModal(options: BuildModalOptions | ModalBuilder): ModalComponentData {
  if (hasToJSON(options)) {
    return options.toJSON() as unknown as ModalComponentData;
  }

  return {
    title: options.title,
    customId: options.customId,
    components: options.components.map(topLevelComponentToData),
  };
}

export function withModalFieldIds<Fields extends Record<string, ModalFieldDefinition>>(
  fields: Fields,
): Fields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.withCustomId(key)]),
  ) as Fields;
}
