import process from "node:process";

export function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Copy .sample.env to .env and fill it in.`);
  }

  return value;
}
