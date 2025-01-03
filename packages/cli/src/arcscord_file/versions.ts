import type { ArcscordFileParser } from "./type.js";
import { fileV1 } from "./file_v1.js";

export const parsers: Record<number, ArcscordFileParser> = {
  1: fileV1,
};
