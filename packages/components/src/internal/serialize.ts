/** Returns a component's raw data, serializing Discord.js builders through `toJSON()`. */
export function serializeComponent(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Expected a Discord component object or builder");
  }

  if ("toJSON" in value && typeof value.toJSON === "function") {
    return value.toJSON() as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

/** Whether a positional value is a component/string child rather than an options object. */
export function isComponentInput(value: unknown): boolean {
  return typeof value === "string"
    || (typeof value === "object" && value !== null && ("type" in value || "toJSON" in value));
}
