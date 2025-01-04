import type { Result } from "@arcscord/error";
import type { ArcscordFileData } from "./type.js";
import * as fs from "node:fs";
import { anyToError, error, ok } from "@arcscord/error";
import { z } from "zod";
import { parsers } from "./versions.js";

export const baseArcscordFileSchema = z.object({
  version: z.number().int().positive().min(0),
});

export async function parseArcscordFile(file = "./arcscord.json"): Promise<Result<ArcscordFileData, Error>> {
  const fileContent = fs.readFileSync(file).toString();

  let data;
  try {
    data = JSON.parse(fileContent);
  }
  catch (err) {
    return error(anyToError(err));
  }

  const result = baseArcscordFileSchema.safeParse(data);
  if (!result.success) {
    return error(new Error("Invalid version number in arcscord.json file !"));
  }

  if (!Object.hasOwn(parsers, result.data.version)) {
    return error(new Error(`Version ${result.data.version} not supported by current version of @arcscord/cli, try to update it !`));
  }

  const parser = parsers[result.data.version].parse;

  const [err, result2] = await parser(data);
  if (err) {
    return error(err);
  }
  // already check before, no need to more checks
  return ok(result2 as ArcscordFileData);
}
