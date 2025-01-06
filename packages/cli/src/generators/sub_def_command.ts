import type { NodePath } from "@babel/traverse";
import { parse } from "@babel/parser";
import * as types from "@babel/types";
import { esmGenerate, esmTraverse } from "../utils/esm.js";

export type AddToSubDefinitionOptions = {
  name: string;
  path: string;
  type: "sub" | "subGroup";
  fileContent: string;
  impGroupName?: string;
  importExtension: string;
};

export function addToSubDefinition(options: AddToSubDefinitionOptions): string {
  const ast = parse(options.fileContent, {
    sourceType: "module",
    plugins: ["typescript"],
  });

  let edited = false;

  esmTraverse(ast, {
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
    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration;
      if (!types.isVariableDeclaration(declaration) || declaration.declarations.length === 0) {
        return;
      }

      const variableDeclaration = declaration.declarations[0];
      if (!types.isTSSatisfiesExpression(variableDeclaration.init)) {
        return;
      }

      const satisfiesExpression = variableDeclaration.init.typeAnnotation;
      if (
        "typeName" in satisfiesExpression
        && typeof satisfiesExpression.typeName === "object"
        && satisfiesExpression.typeName !== null
        && "name" in satisfiesExpression.typeName
        && satisfiesExpression.typeName.name === "SlashWithSubsCommandDefinition"
      ) {
        console.log("found");
        console.log(JSON.stringify(path.node, null, 2));
      }

      edited = true;
    },
  });

  if (!edited) {
    throw new Error("No satisfies expression found");
  }
  return esmGenerate(ast, {
  }).code;
}

export function objectGetProperty(obj: types.ObjectExpression, property: string):
 types.ObjectProperty | undefined {
  return obj.properties.filter(p => types.isObjectProperty(p)).find((p) => {
    if (types.isObjectProperty(p)) {
      if (p.key.type === "Identifier" && p.key.name === property) {
        return types.isObjectProperty(p);
      }
    }
    return false;
  });
}

export function getObjectStringPropertyValue(property: types.ObjectProperty): string | null {
  if (property.value.type !== "StringLiteral") {
    return null;
  }
  return property.value.value;
}
