import { Node } from "ts-morph";
import type { Node as MorphNode } from "ts-morph";
import type { Config } from "cplint";

export function classifyDeclaration(
  decl: MorphNode,
  name: string,
  _config: Config,
): string {
  if (Node.isClassDeclaration(decl)) {
    const decoratorNames = decl.getDecorators().map((d) => d.getName());
    if (decoratorNames.includes("Component")) {
      if (/Page(Component)?$/.test(name)) return "page";
      return "component";
    }
    if (decoratorNames.includes("Directive")) return "directive";
    if (decoratorNames.includes("Pipe")) return "pipe";
    if (decoratorNames.includes("NgModule")) return "module";
    if (decoratorNames.includes("Injectable")) {
      if (/Guard$/.test(name)) return "guard";
      if (/Facade$/.test(name)) return "facade";
      if (/Store$/.test(name)) return "store";
      if (/Repository$/.test(name)) return "repository";
      return "service";
    }
    return "class";
  }
  if (Node.isFunctionDeclaration(decl)) return "function";
  if (Node.isVariableDeclaration(decl)) return "variable";
  if (Node.isInterfaceDeclaration(decl)) return "interface";
  if (Node.isTypeAliasDeclaration(decl)) return "type";
  if (Node.isEnumDeclaration(decl)) return "enum";
  return "unknown";
}
