import { Node } from "ts-morph";
import type { Node as MorphNode } from "ts-morph";

export function getTypeTargetNode(decl: MorphNode): MorphNode {
  if (Node.isVariableDeclaration(decl)) {
    return decl.getInitializer() || decl;
  }

  return decl;
}
