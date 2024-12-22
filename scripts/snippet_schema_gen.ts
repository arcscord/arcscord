import { writeFileSync } from "node:fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { snippetSchema } from "../packages/cli/src/arcscord_snippet/arcscord_snippet.zod";

const outPath = "./docs/snippet-schema.json";

const schema = zodToJsonSchema(snippetSchema);
console.log(schema);
writeFileSync(outPath, JSON.stringify(schema, null, 2));
