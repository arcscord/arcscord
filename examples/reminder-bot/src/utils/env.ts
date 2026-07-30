import process from "node:process";

export function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Copy .sample.env to .env and fill it in.`);
  }

  return value;
}

export function readPortEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new RangeError(`${name} must be an integer between 1 and 65535.`);
  }

  return value;
}
