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
  i18n?: boolean;
  nameLocalizationName?: string;
  descriptionLocalizationName?: string;
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
        const groupsObject = getObjectPropertyOrCreate(
          variableDeclaration.init.expression,
          "subCommandGroup",
          types.objectExpression([]),
        );

        const groupObject = getObjectPropertyOrCreate(
          groupsObject.value,
          options.impGroupName,
          generateDefaultGroupObject(options),
        );

        subCommandsArray = getObjectPropertyOrCreate(
          groupObject.value,
          "subCommands",
          types.arrayExpression([]),
        );
      }
      else {
        subCommandsArray = getObjectPropertyOrCreate(
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
function generateDefaultGroupObject(options: AddToSubDefinitionOptions): types.ObjectExpression {
  if (options.i18n) {
    return types.objectExpression([
      types.objectProperty(types.identifier("nameLocalizations"), i18nCallback(options.nameLocalizationName ?? "default.name")),
      types.objectProperty(types.identifier("description"), types.stringLiteral("Group description")),
      types.objectProperty(types.identifier("descriptionLocalizations"), i18nCallback(options.descriptionLocalizationName ?? "default.description")),
      types.objectProperty(types.identifier("subCommands"), types.arrayExpression([])),
    ]);
  }
  return types.objectExpression([
    types.objectProperty(types.identifier("description"), types.stringLiteral("Group description")),
    types.objectProperty(types.identifier("subCommands"), types.arrayExpression([])),
  ]);
}

function i18nCallback(value: string): types.ArrowFunctionExpression {
  return types.arrowFunctionExpression(
    [types.identifier("t")],
    types.callExpression(
      types.identifier("t"),
      [types.stringLiteral(value)],
    ),
  );
}

function getObjectPropertyOrCreate<T extends types.Expression>(
  obj: types.ObjectExpression,
  propertyName: string,
  create: T,
): types.ObjectProperty & { value: T } {
  const index = obj.properties.findIndex((p) => {
    if (!types.isObjectProperty(p)) {
      return false;
    }

    if (p.key.type !== "Identifier") {
      return false;
    }

    return p.key.name === propertyName;
  });

  let property;
  if (index === -1) {
    const length = obj.properties.push(types.objectProperty(
      types.identifier(propertyName),
      create,
    ));
    property = obj.properties[length - 1];
  }
  else {
    property = obj.properties[index] as types.ObjectProperty;
    if (property.value.type !== create.type) {
      throw new Error(`Found ${propertyName} property in object but it was not a ${create.type}`);
    }
  }

  return property as types.ObjectProperty & { value: T };
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
