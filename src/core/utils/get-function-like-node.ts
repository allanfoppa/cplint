import { Node } from "ts-morph";
import type {
  ArrowFunction,
  FunctionDeclaration,
  FunctionExpression,
  MethodDeclaration,
  Node as MorphNode,
} from "ts-morph";

export function getFunctionLikeNode(
  decl: MorphNode,
):
  | FunctionDeclaration
  | MethodDeclaration
  | ArrowFunction
  | FunctionExpression
  | null {
  if (
    Node.isFunctionDeclaration(decl) ||
    Node.isMethodDeclaration(decl) ||
    Node.isFunctionExpression(decl) ||
    Node.isArrowFunction(decl)
  ) {
    return decl;
  }

  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();

    if (
      init &&
      (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
    ) {
      return init;
    }
  }

  return null;
}
