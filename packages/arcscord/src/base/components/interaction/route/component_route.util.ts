import type { IdInitialiseFunction, RouteVariablesObject } from "./component_route.type";
import { ArcscordError, arcscordErrorCodes } from "#/utils/error";

export type RoutePart = {
  type: "static";
  value: string;
} | {
  type: "param";
  name: string;
};

export type CompiledComponentRoute = {
  canonical: string;
  parts: RoutePart[];
};

export const maxComponentCustomIdLength = 100;

const staticSegmentRegex = /^[\w-]+$/;
const routeParamRegex = /^[A-Z_]\w*$/i;

export function validateComponentRoute(route: string): string | null {
  if (route.length === 0) {
    return "route cannot be empty";
  }

  if (route.length > maxComponentCustomIdLength) {
    return `route cannot exceed ${maxComponentCustomIdLength} characters, got ${route.length}`;
  }

  if (route.startsWith("/")) {
    return "route cannot start with /";
  }

  if (route.endsWith("/")) {
    return "route cannot end with /";
  }

  const segments = route.split("/");
  const paramNames = new Set<string>();
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment.length === 0) {
      return `route segment ${i + 1} cannot be empty`;
    }

    if (segment.includes("$")) {
      return `route segment "${segment}" cannot contain $, it is reserved for generated dynamic values`;
    }

    const opensParam = segment.startsWith("{");
    const closesParam = segment.endsWith("}");
    if (opensParam || closesParam) {
      if (!opensParam || !closesParam) {
        return `route segment "${segment}" has an incomplete dynamic parameter, expected {name}`;
      }

      const paramName = segment.slice(1, -1);
      if (paramName.length === 0) {
        return "route parameter name cannot be empty";
      }

      if (!routeParamRegex.test(paramName)) {
        return `route parameter "${paramName}" is invalid, expected letters, numbers, or _, and cannot start with a number`;
      }

      if (paramNames.has(paramName)) {
        return `route parameter "${paramName}" is declared more than once`;
      }

      paramNames.add(paramName);
      continue;
    }

    if (!staticSegmentRegex.test(segment)) {
      return `route segment "${segment}" is invalid, expected letters, numbers, _, or -`;
    }
  }

  return null;
}

export function readRouteParts(route: string): RoutePart[] {
  const parts: RoutePart[] = [];
  let segment = "";

  for (let i = 0; i <= route.length; i++) {
    const char = route[i];
    if (char !== "/" && i !== route.length) {
      segment += char;
      continue;
    }

    if (segment.startsWith("{") && segment.endsWith("}")) {
      parts.push({ type: "param", name: segment.slice(1, -1) });
    }
    else {
      parts.push({ type: "static", value: segment });
    }
    segment = "";
  }

  return parts;
}

export function compileComponentRoute(route: string): CompiledComponentRoute {
  const invalidReason = validateComponentRoute(route);
  if (invalidReason !== null) {
    throw new ArcscordError({
      code: arcscordErrorCodes.ComponentRouteInvalid,
      message: `Invalid component route "${route}": ${invalidReason}`,
      metadata: { route, reason: invalidReason },
    });
  }

  const parts = readRouteParts(route);
  return {
    parts,
    canonical: parts.map((part) => {
      return part.type === "param" ? "$" : part.value;
    }).join("/"),
  };
}

export function readCustomIdParts(customId: string): string[] {
  const parts: string[] = [];
  let segment = "";

  for (let i = 0; i <= customId.length; i++) {
    const char = customId[i];
    if (char !== "/" && i !== customId.length) {
      segment += char;
      continue;
    }

    parts.push(segment);
    segment = "";
  }

  return parts;
}

export function matchComponentRoute(compiledRoute: CompiledComponentRoute, customId: string): Record<string, string> | null {
  const customIdParts = readCustomIdParts(customId);
  if (customIdParts.length !== compiledRoute.parts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < compiledRoute.parts.length; i++) {
    const routePart = compiledRoute.parts[i];
    const customIdPart = customIdParts[i];

    if (routePart.type === "static") {
      if (customIdPart !== routePart.value) {
        return null;
      }
      continue;
    }

    if (!customIdPart.startsWith("$")) {
      return null;
    }

    try {
      params[routePart.name] = decodeURIComponent(customIdPart.slice(1));
    }
    catch {
      return null;
    }
  }

  return params;
}

export function createRouteId<Route extends string>(
  route: Route,
  options?: RouteVariablesObject<Route>,
): IdInitialiseFunction {
  const compiledRoute = compileComponentRoute(route);

  return () => {
    const customId = compiledRoute.parts.map((part) => {
      if (part.type === "static") {
        return part.value;
      }

      const value = options?.[part.name as keyof RouteVariablesObject<Route>];
      if (value === undefined) {
        throw new Error(`Missing route parameter ${part.name}`);
      }

      return `$${encodeURIComponent(value)}`;
    }).join("/");

    if (customId.length > maxComponentCustomIdLength) {
      throw new ArcscordError({
        code: arcscordErrorCodes.ComponentCustomIdTooLong,
        message: `Component custom ID generated from route ${route} exceeds ${maxComponentCustomIdLength} characters`,
        metadata: { route, length: customId.length, maximum: maxComponentCustomIdLength },
      });
    }

    return customId;
  };
}

export function hasComponentRouteParams(route: string): boolean {
  return readRouteParts(route).some(part => part.type === "param");
}
