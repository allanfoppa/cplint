import type { Node as MorphNode, SourceFile } from "ts-morph";
import { hasReferenceSearch } from "./has-reference-search.js";

export function isImportBindingUsedInFile(
  node: MorphNode,
  sourceFile: SourceFile,
): boolean {
  if (!hasReferenceSearch(node)) {
    return false;
  }

  return node
    .findReferencesAsNodes()
    .some((ref) => ref.getSourceFile() === sourceFile && ref !== node);
}
