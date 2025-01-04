import type { ArcscordFileData } from "./type";

export function generateArcscordFile(data: ArcscordFileData): string {
  return JSON.stringify(data, null, 2);
}
