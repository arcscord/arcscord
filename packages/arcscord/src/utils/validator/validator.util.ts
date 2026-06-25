import type { ErrorOptions } from "@arcscord/better-error";
import type { Result } from "@arcscord/error";
import type { InternalError } from "#/utils/error/class/internal_error";
import { error, ok } from "@arcscord/error";

export type ValidationErrorFactory<Err extends InternalError = InternalError> = (options: ErrorOptions) => Err;

export type ValidationContext<Err extends InternalError = InternalError> = {
  createError: ValidationErrorFactory<Err>;
  group?: string;
};

type ValidationDebugs = Record<string, unknown>;

function validationError<Err extends InternalError>(
  context: ValidationContext<Err>,
  message: string,
  debugs: ValidationDebugs,
): Result<true, Err> {
  return error(context.createError({
    message,
    debugs: {
      ...("group" in context ? { group: context.group } : {}),
      ...debugs,
    },
  }));
}

export function validateRequiredStringLength<Err extends InternalError>(
  value: string,
  path: string,
  maxLength: number,
  context: ValidationContext<Err>,
  minLength = 1,
): Result<true, Err> {
  if (value.length < minLength || value.length > maxLength) {
    return validationError(
      context,
      `${path} must be between ${minLength} and ${maxLength} characters (got ${value.length})`,
      {
        path,
        valueLength: value.length,
        minLength,
        maxLength,
      },
    );
  }

  return ok(true);
}

export function validateRegex<Err extends InternalError>(
  value: string,
  path: string,
  pattern: RegExp,
  message: string,
  context: ValidationContext<Err>,
): Result<true, Err> {
  if (!pattern.test(value)) {
    return validationError(context, message, {
      path,
      value,
      pattern: String(pattern),
    });
  }

  return ok(true);
}

export function validateLowercase<Err extends InternalError>(
  value: string,
  path: string,
  context: ValidationContext<Err>,
): Result<true, Err> {
  if (value !== value.toLowerCase()) {
    return validationError(context, `${path} must be lowercase when letters have lowercase variants`, {
      path,
      value,
    });
  }

  return ok(true);
}

export function validateUniqueName<Err extends InternalError>(
  names: Map<string, string>,
  key: string,
  name: string,
  subject: string,
  context: ValidationContext<Err>,
): Result<true, Err> {
  const existing = names.get(key);
  if (existing) {
    return validationError(context, `duplicate ${subject} name "${name}" in group "${context.group ?? "unknown"}"`, {
      subject,
      name,
      firstPath: existing,
    });
  }

  names.set(key, subject);
  return ok(true);
}

export function validateNumberBounds<Err extends InternalError>(
  value: number | undefined,
  path: string,
  field: string,
  min: number,
  max: number,
  context: ValidationContext<Err>,
): Result<true, Err> {
  if (typeof value !== "number") {
    return ok(true);
  }

  if (value < min || value > max) {
    return validationError(context, `${path} ${field} must be between ${min} and ${max}`, {
      path,
      field,
      value,
      min,
      max,
    });
  }

  return ok(true);
}

export function validateOrderedBounds<Err extends InternalError>(
  minValue: number | undefined,
  maxValue: number | undefined,
  path: string,
  minField: string,
  maxField: string,
  context: ValidationContext<Err>,
): Result<true, Err> {
  if (typeof minValue !== "number" || typeof maxValue !== "number" || minValue <= maxValue) {
    return ok(true);
  }

  return validationError(context, `${path} ${minField} cannot be greater than ${maxField}`, {
    path,
    minField,
    maxField,
    minValue,
    maxValue,
  });
}

export function validateLocalizations<Err extends InternalError>(
  localizations: Record<string, string> | undefined,
  path: string,
  validate: (value: string, localePath: string) => Result<true, Err>,
): Result<true, Err> {
  if (!localizations) {
    return ok(true);
  }

  for (const [locale, value] of Object.entries(localizations)) {
    const [err] = validate(value, `${path} localization "${locale}"`);
    if (err) {
      return error(err);
    }
  }

  return ok(true);
}
