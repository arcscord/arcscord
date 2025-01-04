export function noIncompatibleOptions<T extends string>(options: Record<string, boolean | string | undefined>, exclusiveOptions: T[]): T | undefined {
  const selectedOptions = exclusiveOptions.filter(option => typeof options[option] !== "undefined");

  if (selectedOptions.length > 1) {
    throw new Error(`The options --${selectedOptions.join(", --")} cannot be used together.`);
  }

  if (selectedOptions.length === 1) {
    return selectedOptions[0];
  }

  return undefined;
}
