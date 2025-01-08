import { parse } from "@babel/parser";
import * as types from "@babel/types";
import { esmGenerate, esmTraverse } from "../utils/esm.js";
import { addImport } from "./utils.js";

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
    Program: addImport(options.path + options.importExtension, options.name),

    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration;
      if (!types.isVariableDeclaration(declaration) || declaration.declarations.length === 0) {
        return;
      }

      const variableDeclaration = declaration.declarations[0];
      if (!isValidDeclaration(variableDeclaration, "slashWithSubsCommandDefinition")) {
        return;
      }

      if (options.impGroupName) {
        const groupsProperty = objectGetProperty(variableDeclaration.init.expression, "subCommandGroup")
          || types.objectProperty(types.identifier("subCommandGroup"), types.objectExpression([]));
        if (!types.isObjectExpression(groupsProperty.value)) {
          groupsProperty.value = types.objectExpression([]);
        }

        const groupProperty = objectGetProperty(groupsProperty.value, options.impGroupName)
          || types.objectProperty(types.identifier(options.impGroupName), types.objectExpression([
            types.objectProperty(types.identifier("description"), types.stringLiteral("Group description")),
            types.objectProperty(types.identifier("subCommands"), types.arrayExpression([])),
          ]));

        if (!types.isObjectExpression(groupProperty.value)) {
          groupProperty.value = types.objectExpression([
            types.objectProperty(types.identifier("description"), types.stringLiteral("Group description")),
            types.objectProperty(types.identifier("subCommands"), types.arrayExpression([])),
          ]);
        }

        const subCommandsArrayExpression = groupProperty.value.properties.filter(p => types.isObjectProperty(p)).find(
          p => p.key.type === "Identifier" && p.key.name === "subCommands",
        ) || types.objectProperty(types.identifier("subCommands"), types.arrayExpression([]));

        if (!types.isArrayExpression(subCommandsArrayExpression.value)) {
          subCommandsArrayExpression.value = types.arrayExpression([]);
        }

        const elementExists = subCommandsArrayExpression.value.elements.find(
          element => element && element.type === "Identifier" && element.name === options.name,
        );
        if (elementExists) {
          return;
        }
        subCommandsArrayExpression.value.elements.push(types.identifier(options.name));

        const index = groupProperty.value.properties.findIndex(
          p => types.isObjectProperty(p) && p.key.type === "Identifier" && p.key.name === "subCommands",
        );
        if (index === -1) {
          groupProperty.value.properties.push(subCommandsArrayExpression);
        }
        else {
          groupProperty.value.properties[index] = subCommandsArrayExpression;
        }

        const index2 = groupsProperty.value.properties.findIndex(
          p => types.isObjectProperty(p) && p.key.type === "Identifier" && p.key.name === options.impGroupName,
        );
        if (index2 === -1) {
          groupsProperty.value.properties.push(groupProperty);
        }

        const index3 = variableDeclaration.init.expression.properties.findIndex(
          p => types.isObjectProperty(p) && p.key.type === "Identifier" && p.key.name === "subCommandGroup",
        );
        if (index3 === -1) {
          variableDeclaration.init.expression.properties.push(groupsProperty);
        }
        else {
          variableDeclaration.init.expression.properties[index3] = groupsProperty;
        }
        edited = true;
        return;
      }
      const subCommandsArray = variableDeclaration.init.expression.properties.filter(p => types.isObjectProperty(p)).find(
        p => types.isObjectProperty(p) && p.key.type === "Identifier" && p.key.name === "subCommands",
      ) || types.objectProperty(types.identifier("subCommands"), types.arrayExpression([]));

      if (!types.isArrayExpression(subCommandsArray.value)) {
        subCommandsArray.value = types.arrayExpression([]);
      }

      const elementExists = subCommandsArray.value.elements.find(
        element => element && element.type === "Identifier" && element.name === options.name,
      );
      if (elementExists) {
        return;
      }
      subCommandsArray.value.elements.push(types.identifier(options.name));

      const index = variableDeclaration.init.expression.properties.findIndex(
        p => types.isObjectProperty(p) && p.key.type === "Identifier" && p.key.name === "subCommandsGroups",
      );
      if (index === -1) {
        variableDeclaration.init.expression.properties.push(subCommandsArray);
      }
      else {
        variableDeclaration.init.expression.properties[index] = subCommandsArray;
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

function isValidDeclaration(declaration: types.VariableDeclarator, name: string):
declaration is types.VariableDeclarator & {
  init: types.TSSatisfiesExpression & {
    typeAnnotation: types.TSTypeReference & {
      typeName: types.Identifier;
    };
    expression: types.ObjectExpression;
  };
} {
  if (!types.isTSSatisfiesExpression(declaration.init)) {
    return false;
  }

  const satisfiesExpression = declaration.init.typeAnnotation;
  if (!types.isTSTypeReference(satisfiesExpression)) {
    return false;
  }

  if (!types.isIdentifier(satisfiesExpression.typeName)) {
    return false;
  }

  if (satisfiesExpression.typeName.name !== name) {
    return false;
  }

  if (!types.isObjectExpression(declaration.init.expression)) {
    return false;
  }

  return true;
}
