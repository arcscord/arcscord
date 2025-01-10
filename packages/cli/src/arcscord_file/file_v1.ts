import type { ArcscordFileParser } from "./type.js";
import { error, ok } from "@arcscord/error";
import { z } from "zod";

const fileDataSchema = z.object({
  packageManager: z.object({
    type: z.enum(["npm", "pnpm", "yarn"]),
  }),
  basePaths: z.object({
    root: z.string(),
    commands: z.string(),
    events: z.string(),
    components: z.string(),
    tasks: z.string(),
    handlerList: z.string(),
  }),
  options: z.array(z.enum(["i18n", "eslint", "prettier"])),
  version: z.literal(1),
  i18n: z.object({
    defaultCommandNamePattern: z.string().optional(),
    defaultCommandDescriptionPattern: z.string().optional(),
    defaultSubCommandNamePattern: z.string().optional(),
    defaultSubCommandDescriptionPattern: z.string().optional(),
    defaultSubCommandGroupNamePattern: z.string().optional(),
    defaultSubCommandGroupDescriptionPattern: z.string().optional(),
    defaultSubCommandWithGroupNamePattern: z.string().optional(),
    defaultSubCommandWithGroupDescriptionPattern: z.string().optional(),
  }).optional(),
});

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
