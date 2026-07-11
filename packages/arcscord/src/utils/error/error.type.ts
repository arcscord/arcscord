/** Arbitrary structured debug metadata attached to logs and errors, keyed by name. */
export type DebugValues = { [key: string]: unknown };
/** A single debug entry reduced to a `[key, value]` pair of strings. */
export type DebugValueString = [key: string, value: string];
