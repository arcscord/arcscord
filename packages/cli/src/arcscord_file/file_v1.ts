import type { ArcscordFileParser } from "./type.js";
import { error, ok } from "@arcscord/error";
import { z } from "zod";
import { baseArcscordFileSchema } from "./func.js";

const fileDataSchema = z.object({
  packageManager: z.object({
    type: z.enum(["npm", "pnpm", "yarn"]),
  }),
  options: z.array(z.enum(["i18n", "eslint", "prettier"])),
}).merge(baseArcscordFileSchema);

export const fileV1: ArcscordFileParser = {
  version: 1,
  parse: (data) => {
    const result = fileDataSchema.safeParse(data);
    if (!result.success) {
      return error(result.error);
    }
    return ok(result.data);
  },
};
