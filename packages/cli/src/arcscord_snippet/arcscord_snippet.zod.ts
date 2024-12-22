import { z } from "zod";

export const snippetSchema = z
  .object({
    name: z.string().describe("The name of the snippet"),
    description: z
      .string()
      .describe("The description of the snippet")
      .optional(),
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/)
      .describe("The version of the snippet (semver)")
      .optional(),
    author: z
      .union([
        z.string().describe("The author of the snippet"),
        z.any().describe("The author of the snippet"),
      ])
      .refine(x => typeof x === "string" || typeof x === "object", {
        message: "Invalid input: Should pass single schema",
      })
      .optional(),
    contributors: z
      .array(z.any())
      .describe("The contributors to the snippet")
      .optional(),
    license: z
      .union([
        z.string().describe("The license name of the snippet"),
        z
          .object({
            type: z.string().describe("The type of license"),
            url: z
              .string()
              .url()
              .describe("The URL to the full license text")
              .optional(),
            text: z
              .string()
              .describe("The full license text")
              .optional(),
          })
          .describe("The full license information"),
      ])
      .describe("The license of the snippet")
      .optional(),
    homepage: z
      .string()
      .url()
      .describe("The homepage URL of the snippet")
      .optional(),
    repository: z
      .union([
        z
          .string()
          .url()
          .describe("The repository URL"),
        z.object({ type: z.string(), url: z.string().url() }),
      ])
      .refine(x => typeof x === "string" || typeof x === "object", {
        message: "Invalid input: Should pass single schema",
      })
      .describe("The repository information")
      .optional(),
    bugs: z
      .object({
        url: z
          .string()
          .url()
          .describe("The URL of the bug tracker")
          .optional(),
        email: z
          .string()
          .email()
          .describe("The email address for bug reports")
          .optional(),
      })
      .optional(),
    extends: z
      .string()
      .describe("The base snippet this extends from")
      .optional(),
    $schema: z
      .string()
      .describe("The JSON Schema URL")
      .optional(),
    template: z
      .literal(true)
      .describe(
        "Whether the snippet is a template, for example a global descriptor snippet",
      )
      .optional(),
    file: z
      .string()
      .describe("The path to the snippet file")
      .optional(),
    fileContent: z
      .string()
      .describe("The direct content of the snippet")
      .optional(),
  })
  .strict()
  .describe("A snippet for arcscord");
