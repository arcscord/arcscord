/**
 * Converts any value to an Error object.
 *
 * @param obj - The value to be converted.
 * @returns The converted Error object.
 */
export function anyToError(obj: unknown): Error {
  try {
    if (obj instanceof Error) {
      return obj;
    }
    if (typeof obj === "string") {
      return new Error(obj);
    }

    if (typeof obj === "object") {
      return new Error(JSON.stringify(obj));
    }
    return new Error(String(obj));
  }
  catch {
    return new Error(String(obj));
  }
}
