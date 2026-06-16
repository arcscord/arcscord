import process from "node:process";

/**
 * Converts an unknown value to a string representation.
 * Handles various data types and provides a fallback for unknown types.
 *
 * @param value - The value to be converted to a string.
 * @returns A string representation of the value.
 */
export function stringifyUnknown(value: unknown): string {
  try {
    if (value === null)
      return "null";

    switch (typeof value) {
      case "string":
        return `"${value}"`;
      case "number":
      case "bigint":
        return value.toString();
      case "boolean":
        return value ? "true" : "false";
      case "function":
      case "symbol":
        return value.toString();
      case "undefined":
        return "undefined";
      case "object":
        return JSON.stringify(value) ?? "unknown";
      default:
        return "unknown";
    }
  }
  catch (e) {
    if (process.env?.DEBUG) {
      console.error("Failed to parse value into string");
      console.warn("Value:", value);
      console.warn("Error:", e);
    }
    return "unknown";
  }
}
