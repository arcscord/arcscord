import type { JTDDataType } from "ajv/dist/core";
import Ajv from "ajv";
import * as schema from "./snippet.json";

export type SnippetOptions = JTDDataType<typeof schema>;

const ajv = new Ajv();
export const snippetValidation = ajv.compile(schema);
