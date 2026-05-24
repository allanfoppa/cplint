import { Node } from "ts-morph";
import type { Node as MorphNode } from "ts-morph";
import type { Config } from "../../../../types/index.js";

/**
 * Classifies an AST declaration node into a human-readable kind string.
 * Used by extract-entrypoints to label each exported symbol.
 */
export function classifyDeclaration(
  decl: MorphNode,
  name: string,
  _config: Config,
): string {
  if (Node.isClassDeclaration(decl)) {
    const decoratorNames = decl.getDecorators().map((d) => d.getName());
    if (decoratorNames.includes("Component")) return "component";
    if (decoratorNames.includes("Injectable")) return "injectable";
    if (decoratorNames.includes("Directive")) return "directive";
    if (decoratorNames.includes("Pipe")) return "pipe";
    return "class";
  }
  if (Node.isFunctionDeclaration(decl)) return "function";
  if (Node.isVariableDeclaration(decl)) return "variable";
  if (Node.isInterfaceDeclaration(decl)) return "interface";
  if (Node.isTypeAliasDeclaration(decl)) return "type";
  if (Node.isEnumDeclaration(decl)) return "enum";
  return "unknown";
}
