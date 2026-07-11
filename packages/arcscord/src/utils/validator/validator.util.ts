import type { Result } from "@arcscord/error";
import { error, ok } from "@arcscord/error";
import { isDiscordLocale } from "#/utils/discord/type/locale.type";
import { ArcscordError } from "#/utils/error/arcscord_error";
import { arcscordErrorCodes } from "#/utils/error/codes";

export type ValidationFailure = ArcscordError<"COMMAND_VALIDATION_FAILED">;

export type ValidationErrorFactory = (options: {
  message: string;
  metadata: Record<string, unknown>;
}) => ValidationFailure;

export type ValidationContext = {
  createError?: ValidationErrorFactory;
  group?: string;
};

type ValidationDebugs = Record<string, unknown>;

function validationError(
  context: ValidationContext,
  message: string,
  debugs: ValidationDebugs,
): Result<true, ValidationFailure> {
  const metadata = {
    rule: String(debugs.rule ?? "validation"),
    ...("group" in context ? { group: context.group } : {}),
    ...debugs,
  };
  return error(context.createError?.({ message, metadata }) ?? new ArcscordError({
    code: arcscordErrorCodes.CommandValidationFailed,
    message,
    metadata,
  }));
}

export function validateRequiredStringLength(
  value: string,
  path: string,
  maxLength: number,
  context: ValidationContext,
  minLength = 1,
): Result<true, ValidationFailure> {
  if (value.length < minLength || value.length > maxLength) {
    return validationError(
      context,
      `${path} must be between ${minLength} and ${maxLength} characters (got ${value.length})`,
      {
        rule: "string-length",
        path,
        valueLength: value.length,
        minLength,
        maxLength,
        value,
      },
    );
  }

  return ok(true);
}

export function validateRegex(
  value: string,
  path: string,
  pattern: RegExp,
  message: string,
  context: ValidationContext,
): Result<true, ValidationFailure> {
  if (!pattern.test(value)) {
    return validationError(context, message, {
      rule: "pattern",
      path,
      value,
      pattern: String(pattern),
    });
  }

  return ok(true);
}

export function validateLowercase(
  value: string,
  path: string,
  context: ValidationContext,
): Result<true, ValidationFailure> {
  if (value !== value.toLowerCase()) {
    return validationError(context, `${path} must be lowercase when letters have lowercase variants`, {
      rule: "lowercase",
      path,
      value,
    });
  }

  return ok(true);
}

export function validateUniqueName(
  names: Map<string, string>,
  key: string,
  name: string,
  subject: string,
  context: ValidationContext,
): Result<true, ValidationFailure> {
  const existing = names.get(key);
  if (existing) {
    return validationError(context, `duplicate ${subject} name "${name}" in group "${context.group ?? "unknown"}"`, {
      rule: "unique-name",
      subject,
      name,
      firstPath: existing,
    });
  }

  names.set(key, subject);
  return ok(true);
}

export function validateNumberBounds(
  value: number | undefined,
  path: string,
  field: string,
  min: number,
  max: number,
  context: ValidationContext,
): Result<true, ValidationFailure> {
  if (typeof value !== "number") {
    return ok(true);
  }

  if (value < min || value > max) {
    return validationError(context, `${path} ${field} must be between ${min} and ${max}`, {
      rule: "number-bounds",
      path,
      field,
      value,
      min,
      max,
    });
  }

  return ok(true);
}

export function validateOrderedBounds(
  minValue: number | undefined,
  maxValue: number | undefined,
  path: string,
  minField: string,
  maxField: string,
  context: ValidationContext,
): Result<true, ValidationFailure> {
  if (typeof minValue !== "number" || typeof maxValue !== "number" || minValue <= maxValue) {
    return ok(true);
  }

  return validationError(context, `${path} ${minField} cannot be greater than ${maxField}`, {
    rule: "ordered-bounds",
    path,
    minField,
    maxField,
    minValue,
    maxValue,
  });
}

export function validateLocalizations(
  localizations: Record<string, string> | undefined,
  path: string,
  context: ValidationContext,
  validate: (value: string, localePath: string) => Result<true, ValidationFailure>,
): Result<true, ValidationFailure> {
  if (!localizations) {
    return ok(true);
  }

  for (const [locale, value] of Object.entries(localizations)) {
    if (!isDiscordLocale(locale)) {
      return validationError(context, `${path} localization "${locale}" is not a supported Discord locale`, {
        rule: "supported-locale",
        path,
        locale,
      });
    }

    const [err] = validate(value, `${path} localization "${locale}"`);
    if (err) {
      return error(err);
    }
  }

  return ok(true);
}
