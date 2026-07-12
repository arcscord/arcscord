import type { Result } from "@arcscord/error";
import { error, ok } from "@arcscord/error";
import { ArcscordError } from "#/utils/error/arcscord_error";
import { arcscordErrorCodes } from "#/utils/error/codes";

type NamedMiddleware = {
  name: string;
};

function findDuplicateMiddlewareName(
  middlewares: readonly NamedMiddleware[] | undefined,
): string | undefined {
  const middlewareNames = new Set<string>();
  for (const middleware of middlewares ?? []) {
    if (middlewareNames.has(middleware.name)) {
      return middleware.name;
    }
    middlewareNames.add(middleware.name);
  }

  return undefined;
}

export function validateCommandMiddlewareNames(
  middlewares: readonly NamedMiddleware[] | undefined,
  commandName: string,
  group: string,
): Result<true, ArcscordError<"COMMAND_VALIDATION_FAILED">> {
  const duplicateName = findDuplicateMiddlewareName(middlewares);
  if (duplicateName !== undefined) {
    return error(new ArcscordError({
      code: arcscordErrorCodes.CommandValidationFailed,
      message: `duplicate middleware name "${duplicateName}" in command "${commandName}"`,
      metadata: {
        rule: "unique-middleware-name",
        middlewareName: duplicateName,
        commandName,
        group,
      },
    }));
  }

  return ok(true);
}

export function validateComponentMiddlewareNames(
  middlewares: readonly NamedMiddleware[] | undefined,
  route: string,
): Result<true, ArcscordError<"COMPONENT_VALIDATION_FAILED">> {
  const duplicateName = findDuplicateMiddlewareName(middlewares);
  if (duplicateName !== undefined) {
    return error(new ArcscordError({
      code: arcscordErrorCodes.ComponentValidationFailed,
      message: `duplicate middleware name "${duplicateName}" in component "${route}"`,
      metadata: { rule: "unique-middleware-name", middlewareName: duplicateName, route },
    }));
  }

  return ok(true);
}
