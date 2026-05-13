import type { Node as MorphNode } from "ts-morph";
import { Node } from "ts-morph";
import { Config } from "../types/index.js";

export function classifyDeclaration(
  decl: MorphNode,
  name: string,
  config: Config,
): string {
  for (const rule of config.classifiers) {
    if (rule.name && !new RegExp(rule.name).test(name)) {
      continue;
    }

    if (rule.kind && rule.kind !== decl.getKindName()) {
      continue;
    }

    return rule.label;
  }

  return genericKind(decl);
}

function genericKind(decl: MorphNode): string {
  if (Node.isFunctionDeclaration(decl)) {
    return "function";
  }

  if (Node.isClassDeclaration(decl)) {
    return "class";
  }

  if (Node.isInterfaceDeclaration(decl)) {
    return "interface";
  }

  if (Node.isTypeAliasDeclaration(decl)) {
    return "type";
  }

  if (Node.isEnumDeclaration(decl)) {
    return "enum";
  }

  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();

    if (init && Node.isArrowFunction(init)) {
      return "function";
    }

    if (init && Node.isFunctionExpression(init)) {
      return "function";
    }

    if (init && Node.isObjectLiteralExpression(init)) {
      return "object";
    }

    return "variable";
  }

  return decl.getKindName().toLowerCase();
}
