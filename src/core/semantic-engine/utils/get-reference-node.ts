import type { Node as MorphNode } from "ts-morph";

export function getReferenceNode(decl: MorphNode): MorphNode {
  const nameNodeFn = (
    decl as MorphNode & {
      getNameNode?: () => MorphNode | undefined;
    }
  ).getNameNode;

  if (typeof nameNodeFn === "function") {
    const node = nameNodeFn.call(decl);

    if (node) return node;
  }

  return decl;
}
