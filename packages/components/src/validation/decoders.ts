import type { UnknownRecord, ValidationContext } from "./context";
import { childContext, componentTypeOf, isUnknownRecord, validationFailure } from "./context";

type Decoder<Value> = (value: unknown, context: ValidationContext) => Value;

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.hasOwn(record, key);
}

function decodedValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => decodedValuesEqual(value, right[index]));
  }
  if (isUnknownRecord(left) && isUnknownRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length
      && leftKeys.every(key => hasOwn(right, key) && decodedValuesEqual(left[key], right[key]));
  }
  return false;
}

export function requiredField<Value>(
  record: UnknownRecord,
  key: string,
  context: ValidationContext,
  decode: Decoder<Value>,
): Value {
  return decode(record[key], childContext(context, key));
}

export function optionalField<Value>(
  record: UnknownRecord,
  key: string,
  context: ValidationContext,
  decode: Decoder<Value>,
): Value | undefined {
  const value = record[key];
  return value === undefined ? undefined : decode(value, childContext(context, key));
}

export function assertComponentType<Type extends number>(
  record: UnknownRecord,
  expected: Type,
  context: ValidationContext,
): asserts record is UnknownRecord & { readonly type: Type } {
  if (record.type !== expected) {
    validationFailure(childContext(context, "type"), "unexpected-component-type", `${context.path}.type must be one of the accepted component types`, componentTypeOf(record), {
      expected: [expected],
      actual: record.type,
    });
  }
}

export function decodeComponentId(record: UnknownRecord, context: ValidationContext): number | undefined {
  return optionalField(record, "id", context, (value, fieldContext) => {
    return decodeInteger(value, fieldContext, 0, 0xFFFF_FFFF, componentTypeOf(record));
  });
}

export function optionalAliasedField<Value>(
  record: UnknownRecord,
  camelCase: string,
  snakeCase: string,
  context: ValidationContext,
  decode: Decoder<Value>,
): Value | undefined {
  const hasCamelCase = hasOwn(record, camelCase) && record[camelCase] !== undefined;
  const hasSnakeCase = hasOwn(record, snakeCase) && record[snakeCase] !== undefined;
  if (!hasCamelCase && !hasSnakeCase) {
    return undefined;
  }

  const fieldContext = childContext(context, camelCase);
  const camelValue = hasCamelCase ? decode(record[camelCase], fieldContext) : undefined;
  const snakeValue = hasSnakeCase ? decode(record[snakeCase], fieldContext) : undefined;
  if (hasCamelCase && hasSnakeCase && !decodedValuesEqual(camelValue, snakeValue)) {
    validationFailure(
      fieldContext,
      "conflicting-field-aliases",
      `${context.path} defines conflicting ${camelCase} and ${snakeCase} values`,
      undefined,
      { camelCase, snakeCase },
    );
  }
  return hasCamelCase ? camelValue : snakeValue;
}

export function requiredAliasedField<Value>(
  record: UnknownRecord,
  camelCase: string,
  snakeCase: string,
  context: ValidationContext,
  decode: Decoder<Value>,
): Value {
  const value = optionalAliasedField(record, camelCase, snakeCase, context, decode);
  if (value === undefined) {
    return decode(undefined, childContext(context, camelCase));
  }
  return value;
}

export function decodeString(
  value: unknown,
  context: ValidationContext,
  minimum: number,
  maximum: number,
  componentType?: number,
): string {
  if (typeof value !== "string") {
    validationFailure(context, "string", `${context.path} must be a string`, componentType, {
      actualType: value === null ? "null" : typeof value,
    });
  }
  if (value.length < minimum || value.length > maximum) {
    validationFailure(
      context,
      "string-length",
      `${context.path} must contain between ${minimum} and ${maximum} characters`,
      componentType,
      { minimum, maximum, actual: value.length },
    );
  }
  return value;
}

export function decodeBoolean(value: unknown, context: ValidationContext, componentType?: number): boolean {
  if (typeof value !== "boolean") {
    validationFailure(context, "boolean", `${context.path} must be a boolean`, componentType, {
      actualType: typeof value,
    });
  }
  return value;
}

export function decodeInteger(
  value: unknown,
  context: ValidationContext,
  minimum: number,
  maximum: number,
  componentType?: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    validationFailure(
      context,
      "integer-range",
      `${context.path} must be an integer between ${minimum} and ${maximum}`,
      componentType,
      { minimum, maximum, actual: typeof value === "number" ? value : undefined },
    );
  }
  return value;
}

export function decodeSnowflake(value: unknown, context: ValidationContext, componentType?: number): string {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    validationFailure(context, "snowflake", `${context.path} must be a Discord snowflake`, componentType);
  }
  if (BigInt(value) > 0xFFFF_FFFF_FFFF_FFFFn) {
    validationFailure(context, "snowflake", `${context.path} must fit in an unsigned 64-bit integer`, componentType, {
      maximum: "18446744073709551615",
      actual: value,
    });
  }
  return value;
}

export function decodeRecord(value: unknown, context: ValidationContext, componentType?: number): UnknownRecord {
  if (!isUnknownRecord(value)) {
    validationFailure(context, "object", `${context.path} must be an object`, componentType, {
      actualType: value === null ? "null" : typeof value,
    });
  }
  return value;
}

export function decodeArray<Value>(
  value: unknown,
  context: ValidationContext,
  minimum: number,
  maximum: number,
  rule: string,
  componentType: number | undefined,
  decode: Decoder<Value>,
): Value[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    validationFailure(
      context,
      rule,
      `${context.path} must contain between ${minimum} and ${maximum} items`,
      componentType,
      { minimum, maximum, actual: Array.isArray(value) ? value.length : undefined },
    );
  }
  return value.map((item, index) => decode(item, childContext(context, index)));
}

export function decodeUrl(
  value: unknown,
  context: ValidationContext,
  protocols: readonly string[],
  componentType?: number,
  maximumLength: number = Number.MAX_SAFE_INTEGER,
): string {
  const url = decodeString(value, context, 1, maximumLength, componentType);
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  }
  catch (cause) {
    validationFailure(context, "url", `${context.path} must be a valid URL`, componentType, {}, cause);
  }
  if (protocols.length > 0 && !protocols.includes(protocol)) {
    validationFailure(
      context,
      "url-protocol",
      `${context.path} must use one of: ${protocols.join(", ")}`,
      componentType,
      { allowedProtocols: protocols, actualProtocol: protocol },
    );
  }
  return url;
}

export function decodeNullableString(
  value: unknown,
  context: ValidationContext,
  minimum: number,
  maximum: number,
  componentType?: number,
): string | null {
  return value === null ? null : decodeString(value, context, minimum, maximum, componentType);
}
