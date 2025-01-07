import type { NodePath, VisitNode } from "@babel/traverse";
import * as types from "@babel/types";

export function addImport(
  pathName: string,
  importName: string,
  returnCallback?: (importExist: boolean | null, importNameExist: boolean | null) => void,
): VisitNode<types.Node, types.Program> {
  return function (path: NodePath<types.Program>) {
    const existingImportName = path.node.body.some((node) => {
      if (!types.isImportDeclaration(node)) {
        return false;
      }
      return !!node.specifiers.some((specifier) => {
        return types.isImportSpecifier(specifier) && specifier.local.name === importName;
      });
    });

    if (existingImportName) {
      if (returnCallback) {
        returnCallback(null, true);
      }
      return;
    }

    const existingImportPath = path.node.body.findIndex((node) => {
      if (!types.isImportDeclaration(node)) {
        return false;
      }
      return node.source.value === pathName;
    });

    if (existingImportPath !== -1) {
      (path.node.body[existingImportPath] as types.ImportDeclaration).specifiers.push(
        types.importSpecifier(types.identifier(importName), types.identifier(importName)),
      );
      if (returnCallback) {
        returnCallback(true, null);
      }
      return;
    }
    const newImport = types.importDeclaration(
      [types.importSpecifier(types.identifier(importName), types.identifier(importName))],
      types.stringLiteral(pathName),
    );

    let lastImportIndex = -1;
    path.node.body.forEach((node, index) => {
      if (types.isImportDeclaration(node)) {
        lastImportIndex = index;
      }
    });

    path.node.body.splice(lastImportIndex + 1, 0, newImport);
    if (returnCallback) {
      returnCallback(null, null);
    }
  };
}
