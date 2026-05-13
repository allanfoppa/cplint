import type { Node as MorphNode } from "ts-morph";

export function hasReferenceSearch(node: MorphNode): node is MorphNode & {
  findReferencesAsNodes(): MorphNode[];
} {
  return (
    typeof (
      node as MorphNode & {
        findReferencesAsNodes?: unknown;
      }
    ).findReferencesAsNodes === "function"
  );
}
