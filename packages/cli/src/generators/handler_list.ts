import type { NodePath } from "@babel/traverse";
import { parse } from "@babel/parser";
import * as types from "@babel/types";
import { esmGenerate, esmTraverse } from "../utils/esm.js";
import { addImport } from "./utils.js";

export type AddHandlerToListOptions = {
  name: string;
  path: string;
  type: "commands" | "events" | "components" | "tasks";
  fileContent: string;
  importExtension: string;
};

export function addHandlerToList(options: AddHandlerToListOptions): string {
  const ast = parse(options.fileContent, {
    sourceType: "module",
    plugins: ["typescript"],
  });

  esmTraverse(ast, {
    Program: addImport(options.path + options.importExtension, options.name),
    ObjectProperty(path: NodePath<types.ObjectProperty>) {
      if (types.isIdentifier(path.node.key, { name: options.type })) {
        const arrayList = path.node.value;

        if (types.isArrayExpression(arrayList)) {
          const elementExists = arrayList.elements.some(
            element => types.isIdentifier(element, { name: options.name }),
          );

          if (!elementExists) {
            arrayList.elements.push(types.identifier(options.name));
          }
        }
      }
    },
  });

  return esmGenerate(ast, {
  }).code;
}
