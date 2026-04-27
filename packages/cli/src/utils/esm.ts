import generate from "@babel/generator";
import traverse from "@babel/traverse";

function interopDefault<T>(value: T | { default: T }): T {
  if (
    value
    && (typeof value === "object" || typeof value === "function")
    && "default" in value
  ) {
    return value.default;
  }

  return value;
}

export const esmGenerate: typeof generate = interopDefault(generate);
export const esmTraverse: typeof traverse = interopDefault(traverse);
