import type { z } from "zod";
import type { snippetSchema } from "./arcscord_snippet.zod.js";

export type SnippetOptions = z.infer<typeof snippetSchema>;
