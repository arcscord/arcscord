import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export function isMainModule(metaUrl: string): boolean {
  return Boolean(
    process.argv[1]
    && metaUrl === pathToFileURL(resolve(process.argv[1])).href,
  );
}

export function readOption(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

export function requireOption(argv: readonly string[], name: string): string {
  const value = readOption(argv, name);

  if (!value)
    throw new Error(`Missing required ${name} argument.`);

  return value;
}

export function requireEnvironment(name: string): string {
  const value = process.env[name];

  if (!value)
    throw new Error(`Missing required ${name} environment variable.`);

  return value;
}

export function appendGitHubOutputs(outputs: Readonly<Record<string, string>>): void {
  const outputPath = process.env.GITHUB_OUTPUT;

  if (!outputPath)
    return;

  const contents = Object.entries(outputs)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n");

  appendFileSync(outputPath, `${contents}\n`);
}

export async function runCli(callback: () => void | Promise<void>): Promise<void> {
  try {
    await callback();
  }
  catch (cause) {
    console.error(cause instanceof Error ? cause.message : cause);
    process.exitCode = 1;
  }
}
