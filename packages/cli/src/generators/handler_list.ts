import type { NodePath } from "@babel/traverse";
import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as types from "@babel/types";

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

  traverse(ast, {
    Program(path: NodePath<types.Program>) {
      const existingImport = path.node.body.some(node =>
        types.isImportDeclaration(node)
        && node.source.value === (options.path + options.importExtension)
        && node.specifiers.some(
          specifier =>
            types.isImportSpecifier(specifier) && specifier.local.name === options.name,
        ),
      );
      if (!existingImport) {
        const newImport = types.importDeclaration(
          [types.importSpecifier(types.identifier(options.name), types.identifier(options.name))],
          types.stringLiteral(options.path + options.importExtension),
        );

        // Find the last import declaration
        let lastImportIndex = -1;
        path.node.body.forEach((node, index) => {
          if (types.isImportDeclaration(node)) {
            lastImportIndex = index;
          }
        });

        // Insert the new import after the last import declaration
        path.node.body.splice(lastImportIndex + 1, 0, newImport);
      }
    },
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

  return generate(ast, {
  }).code;
}
