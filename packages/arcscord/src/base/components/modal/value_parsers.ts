import type {
  ModalCheckboxGroupValue,
  ModalFieldParseInput,
  ModalFileUploadValue,
  ModalRadioGroupValue,
  ModalSelectableValue,
  ModalStringSelectValue,
} from "../shared/component_definer.type";
import type { CollectionLike, ModalDataLike } from "./types";
import { ComponentType } from "discord-api-types/v10";

function firstValue(value: readonly unknown[]): unknown {
  return value[0];
}

function describeField(customId: string): string {
  return `modal field "${customId}"`;
}

function getField(input: ModalFieldParseInput): ModalDataLike {
  if (typeof input.field !== "object" || input.field === null) {
    throw new TypeError(`Missing ${describeField(input.customId)}`);
  }

  return input.field as ModalDataLike;
}

function getOptionalField(input: ModalFieldParseInput): ModalDataLike | undefined {
  if (input.field === undefined) {
    return undefined;
  }

  return getField(input);
}

function assertFieldType(input: ModalFieldParseInput, expected: ComponentType): ModalDataLike {
  const field = getField(input);
  if (field.type !== expected) {
    throw new TypeError(`${describeField(input.customId)} expected Discord component type ${expected}, got ${String(field.type)}`);
  }

  return field;
}

function assertOptionalFieldType(input: ModalFieldParseInput, expected: ComponentType): ModalDataLike | undefined {
  const field = getOptionalField(input);
  if (!field) {
    return undefined;
  }

  if (field.type !== expected) {
    throw new TypeError(`${describeField(input.customId)} expected Discord component type ${expected}, got ${String(field.type)}`);
  }

  return field;
}

function readStringValue(input: ModalFieldParseInput, expected: ComponentType): string {
  const field = assertFieldType(input, expected);
  if (typeof field.value !== "string") {
    throw new TypeError(`${describeField(input.customId)} expected a string value`);
  }

  return field.value;
}

function readOptionalStringValue(input: ModalFieldParseInput, expected: ComponentType): string | undefined {
  const field = assertOptionalFieldType(input, expected);
  if (!field || field.value === null || field.value === undefined || field.value === "") {
    return undefined;
  }

  if (typeof field.value !== "string") {
    throw new TypeError(`${describeField(input.customId)} expected a string value`);
  }

  return field.value;
}

function readStringValues(input: ModalFieldParseInput, expected: ComponentType, required: boolean): string[] {
  const field = required
    ? assertFieldType(input, expected)
    : assertOptionalFieldType(input, expected);

  if (!field) {
    return [];
  }

  if (!Array.isArray(field.values) || !field.values.every(value => typeof value === "string")) {
    throw new TypeError(`${describeField(input.customId)} expected string values`);
  }

  return [...field.values] as string[];
}

function validateAllowedValues(customId: string, values: string[], allowedValues: readonly string[]): void {
  const allowed = new Set<string>(allowedValues);
  const invalid = values.filter(value => !allowed.has(value));
  if (invalid.length > 0) {
    throw new TypeError(`${describeField(customId)} received invalid values: ${invalid.join(", ")}`);
  }
}

function collectionGet<T>(collection: CollectionLike<T> | undefined, key: string): T | undefined {
  return collection?.get?.(key);
}

export function readTextInputValue(input: ModalFieldParseInput): string {
  return readStringValue(input, ComponentType.TextInput);
}

export function readOptionalTextInputValue(input: ModalFieldParseInput): string | undefined {
  return readOptionalStringValue(input, ComponentType.TextInput);
}

export function readSingleOrManyStrings<
  Options extends readonly string[],
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
>(
  input: ModalFieldParseInput,
  expected: ComponentType,
  options: {
    allowedValues: Options;
    maxValues?: MaxValues;
    required?: Required;
  },
): ModalStringSelectValue<Options, MaxValues, Required> {
  const required = options.required !== false;
  const values = readStringValues(input, expected, required);
  validateAllowedValues(input.customId, values, options.allowedValues);

  if ((options.maxValues ?? 1) === 1) {
    if (values.length > 1) {
      throw new TypeError(`${describeField(input.customId)} expected one selected value, got ${values.length}`);
    }

    const value = firstValue(values);
    if (value === undefined) {
      if (required) {
        throw new TypeError(`${describeField(input.customId)} expected one selected value`);
      }

      return undefined as ModalStringSelectValue<Options, MaxValues, Required>;
    }

    return value as ModalStringSelectValue<Options, MaxValues, Required>;
  }

  if (options.maxValues !== undefined && values.length > options.maxValues) {
    throw new TypeError(`${describeField(input.customId)} expected at most ${options.maxValues} selected values, got ${values.length}`);
  }

  if (!required && values.length === 0) {
    return undefined as ModalStringSelectValue<Options, MaxValues, Required>;
  }

  return values as ModalStringSelectValue<Options, MaxValues, Required>;
}

export function readResolvedSingleOrMany<
  Value,
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
>(
  input: ModalFieldParseInput,
  expected: ComponentType,
  options: {
    maxValues?: MaxValues;
    readValues: (field: ModalDataLike, ids: string[]) => Value[];
    required?: Required;
  },
): ModalSelectableValue<Value, MaxValues, Required> {
  const required = options.required !== false;
  const values = readStringValues(input, expected, required);
  const field = assertOptionalFieldType(input, expected);
  const resolved = field ? options.readValues(field, values) : [];

  if (resolved.length !== values.length) {
    throw new TypeError(`${describeField(input.customId)} expected resolved values for every selected id`);
  }

  if ((options.maxValues ?? 1) === 1) {
    if (resolved.length > 1) {
      throw new TypeError(`${describeField(input.customId)} expected one selected value, got ${resolved.length}`);
    }

    const value = firstValue(resolved);
    if (value === undefined) {
      if (required) {
        throw new TypeError(`${describeField(input.customId)} expected one selected value`);
      }

      return undefined as ModalSelectableValue<Value, MaxValues, Required>;
    }

    return value as ModalSelectableValue<Value, MaxValues, Required>;
  }

  if (options.maxValues !== undefined && resolved.length > options.maxValues) {
    throw new TypeError(`${describeField(input.customId)} expected at most ${options.maxValues} selected values, got ${resolved.length}`);
  }

  if (!required && resolved.length === 0) {
    return undefined as ModalSelectableValue<Value, MaxValues, Required>;
  }

  return resolved as ModalSelectableValue<Value, MaxValues, Required>;
}

export function readFilesSingleOrMany<
  MaxValues extends number | undefined,
  Required extends boolean | undefined,
>(
  input: ModalFieldParseInput,
  options: {
    maxValues?: MaxValues;
    required?: Required;
  },
): ModalFileUploadValue<MaxValues, Required> {
  const required = options.required !== false;
  const values = readStringValues(input, ComponentType.FileUpload, required);
  const field = assertOptionalFieldType(input, ComponentType.FileUpload);
  const attachments = field
    ? values.map(id => collectionGet(field.attachments, id))
    : [];

  if (attachments.includes(undefined)) {
    throw new TypeError(`${describeField(input.customId)} expected resolved attachments for every uploaded file id`);
  }

  if ((options.maxValues ?? 1) === 1) {
    if (attachments.length > 1) {
      throw new TypeError(`${describeField(input.customId)} expected one uploaded file, got ${attachments.length}`);
    }

    const attachment = firstValue(attachments);
    if (attachment === undefined) {
      if (required) {
        throw new TypeError(`${describeField(input.customId)} expected one uploaded file`);
      }

      return undefined as ModalFileUploadValue<MaxValues, Required>;
    }

    return attachment as ModalFileUploadValue<MaxValues, Required>;
  }

  if (options.maxValues !== undefined && attachments.length > options.maxValues) {
    throw new TypeError(`${describeField(input.customId)} expected at most ${options.maxValues} uploaded files, got ${attachments.length}`);
  }

  if (!required && attachments.length === 0) {
    return undefined as ModalFileUploadValue<MaxValues, Required>;
  }

  return attachments as ModalFileUploadValue<MaxValues, Required>;
}

export function readRadioValue<
  Options extends readonly { value: string }[],
  Required extends boolean | undefined,
>(
  input: ModalFieldParseInput,
  options: {
    allowedValues: Options;
    required?: Required;
  },
): ModalRadioGroupValue<Options, Required> {
  const value = options.required === false
    ? readOptionalStringValue(input, ComponentType.RadioGroup)
    : readStringValue(input, ComponentType.RadioGroup);

  if (value === undefined) {
    return undefined as ModalRadioGroupValue<Options, Required>;
  }

  validateAllowedValues(input.customId, [value], options.allowedValues.map(option => option.value));
  return value as ModalRadioGroupValue<Options, Required>;
}

export function readCheckboxValue(input: ModalFieldParseInput): boolean {
  const field = assertFieldType(input, ComponentType.Checkbox);
  if (typeof field.value !== "boolean") {
    throw new TypeError(`${describeField(input.customId)} expected a boolean value`);
  }

  return field.value;
}

export function readCheckboxGroupValue<Options extends readonly { value: string }[]>(
  input: ModalFieldParseInput,
  options: {
    allowedValues: Options;
  },
): ModalCheckboxGroupValue<Options> {
  const values = readStringValues(input, ComponentType.CheckboxGroup, false);
  validateAllowedValues(input.customId, values, options.allowedValues.map(option => option.value));
  return values as ModalCheckboxGroupValue<Options>;
}

export { collectionGet };
