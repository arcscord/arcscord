import { MessageComponentValidationError } from "../validation-error";

export type UnknownRecord = Record<string, unknown>;

export type ValidationContext = {
  readonly path: string;
  readonly serializedBuilders: WeakMap<object, UnknownRecord>;
};

type JsonEncodableUnknown = {
  toJSON: () => unknown;
};

export function rootContext(path: string): ValidationContext {
  return { path, serializedBuilders: new WeakMap() };
}

export function childContext(context: ValidationContext, segment: string | number): ValidationContext {
  return {
    path: typeof segment === "number"
      ? `${context.path}[${segment}]`
      : `${context.path}.${segment}`,
    serializedBuilders: context.serializedBuilders,
  };
}

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Whether a positional value is a component/string child rather than an options object. */
export function isComponentInput(value: unknown): boolean {
  return typeof value === "string"
    || (isUnknownRecord(value) && ("type" in value || "toJSON" in value));
}

function isJsonEncodable(value: unknown): value is JsonEncodableUnknown {
  return isUnknownRecord(value) && typeof value.toJSON === "function";
}

export function componentTypeOf(value: UnknownRecord): number | undefined {
  return typeof value.type === "number" ? value.type : undefined;
}

export function validationFailure(
  context: ValidationContext,
  rule: string,
  message: string,
  componentType?: number,
  details: Readonly<Record<string, unknown>> = {},
  cause?: unknown,
): never {
  throw new MessageComponentValidationError({
    rule,
    path: context.path,
    message,
    details,
    ...(componentType === undefined ? {} : { componentType }),
    ...(cause === undefined ? {} : { cause }),
  });
}

/** Serializes one builder boundary and verifies its runtime result. */
export function serializeInput(value: unknown, context: ValidationContext): UnknownRecord {
  if (!isUnknownRecord(value)) {
    validationFailure(
      context,
      "component-object",
      `${context.path} must be a Discord component object or builder`,
      undefined,
      { actualType: value === null ? "null" : typeof value },
    );
  }

  if (!isJsonEncodable(value)) {
    return value;
  }

  const cached = context.serializedBuilders.get(value);
  if (cached !== undefined) {
    return cached;
  }

  let serialized: unknown;
  try {
    serialized = value.toJSON();
  }
  catch (cause) {
    validationFailure(
      context,
      "builder-serialization",
      `${context.path} builder could not be serialized`,
      undefined,
      { builderName: value.constructor?.name ?? "unknown" },
      cause,
    );
  }

  if (!isUnknownRecord(serialized)) {
    validationFailure(
      context,
      "builder-serialization",
      `${context.path} builder did not serialize to an object`,
      undefined,
      { builderName: value.constructor?.name ?? "unknown" },
      new TypeError("toJSON() did not return an object"),
    );
  }

  context.serializedBuilders.set(value, serialized);
  return serialized;
}
