import { existsSync } from "node:fs";
import { cp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export async function copy(from: string, to: string): Promise<void> {
  await cp(new URL(`../../templates/${from}`, import.meta.url), to, { recursive: true });
}

/**
 *
 * @param file
 * @param content
 * @returns return true is the file was created
 */
export async function readOrCreate(file: string, content: string): Promise<[string, boolean]> {
  try {
    return await [await readFile(file, "utf8"), false];
  }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      throw e;
    }
    await writeFile(file, content, "utf8");
    return [content, true];
  }
}

export function cleanPath(root: string): string {
  const currentDir = process.cwd();
  const absolutePath = path.resolve(root);

  if (absolutePath.startsWith(currentDir)) {
    return absolutePath.slice(currentDir.length + 1);
  }

  return root;
}

export function checkIfFileExist(filePath: string): void {
  if (existsSync(filePath)) {
    console.error(`file ${filePath} already exists`);
    process.exit(1);
  }
}
