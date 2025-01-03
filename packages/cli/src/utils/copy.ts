import { cp } from "node:fs/promises";

export async function copy(from: string, to: string): Promise<void> {
  await cp(new URL(`../../templates/${from}`, import.meta.url), to, { recursive: true });
}
