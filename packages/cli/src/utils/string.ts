export function camelOrPascalToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter, index) => index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`);
}
