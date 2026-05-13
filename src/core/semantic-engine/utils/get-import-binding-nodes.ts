import type { ImportDeclaration, Node as MorphNode } from "ts-morph";

export function getImportBindingNodes(imp: ImportDeclaration): MorphNode[] {
  const nodes = [
    imp.getDefaultImport(),
    imp.getNamespaceImport(),
    ...imp.getNamedImports().map((n) => n.getNameNode()),
  ] as Array<MorphNode | undefined>;

  return nodes.filter((node): node is MorphNode => Boolean(node));
}
