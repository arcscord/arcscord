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
      if (!isValidDeclaration(variableDeclaration, "SlashWithSubsCommandDefinition")) {
        return;
      }

      let subCommandsArray;
      if (options.impGroupName) {
        const groupsObject = getObjectObjectPropertyOrCreate(
          variableDeclaration.init.expression,
          "subCommandGroup",
          types.objectExpression([]),
        );

        const groupObject = getObjectObjectPropertyOrCreate(
          groupsObject.value,
          options.impGroupName,
          types.objectExpression([
            types.objectProperty(types.identifier("description"), types.stringLiteral("Group description")),
            types.objectProperty(types.identifier("subCommands"), types.arrayExpression([])),
          ]),
        );

        subCommandsArray = getObjectArrayPropertyOrCreate(
          groupObject.value,
          "subCommands",
          types.arrayExpression([]),
        );
      }
      else {
        subCommandsArray = getObjectArrayPropertyOrCreate(
          variableDeclaration.init.expression,
          "subCommands",
          types.arrayExpression([]),
        );
      }

      const elementExists = subCommandsArray.value.elements.find(
        element => element && element.type === "Identifier" && element.name === options.name,
      );
      if (elementExists) {
        return;
      }
      subCommandsArray.value.elements.push(types.identifier(options.name));
      edited = true;
    },
  });

  if (!edited) {
    throw new Error("No satisfies expression found");
  }
  return esmGenerate(ast, {
  }).code;
}

function getObjectObjectPropertyOrCreate(obj: types.ObjectExpression, propertyName: string, create: types.ObjectExpression):
types.ObjectProperty & { value: types.ObjectExpression } {
  const index = obj.properties.findIndex((p) => {
    if (!types.isObjectProperty(p)) {
      return false;
    }

    if (p.key.type !== "Identifier") {
      return false;
    }

    return p.key.name === propertyName;
  });

  let objectProperty;
  if (index === -1) {
    const length = obj.properties.push(types.objectProperty(
      types.identifier(propertyName),
      create,
    ));
    objectProperty = obj.properties[length - 1];
  }
  else {
    objectProperty = obj.properties[index] as types.ObjectProperty;
    if (objectProperty.value.type !== "ObjectExpression") {
      throw new Error(`Found ${propertyName} property in object but it was not an object`);
    }
  }

  return objectProperty as types.ObjectProperty & { value: types.ObjectExpression };
}

function getObjectArrayPropertyOrCreate(obj: types.ObjectExpression, propertyName: string, create: types.ArrayExpression):
 types.ObjectProperty & { value: types.ArrayExpression } {
  const index = obj.properties.findIndex((p) => {
    if (!types.isObjectProperty(p)) {
      return false;
    }

    if (p.key.type !== "Identifier") {
      return false;
    }

    return p.key.name === propertyName;
  });

  let arrayProperty;
  if (index === -1) {
    const length = obj.properties.push(types.objectProperty(
      types.identifier(propertyName),
      create,
    ));
    arrayProperty = obj.properties[length - 1];
  }
  else {
    arrayProperty = obj.properties[index] as types.ObjectProperty;
    if (arrayProperty.value.type !== "ArrayExpression") {
      throw new Error(`Found ${propertyName} property in object but it was not an array`);
    }
  }

  return arrayProperty as types.ObjectProperty & { value: types.ArrayExpression };
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
