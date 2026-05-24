import type { Node as MorphNode, TypeChecker } from "ts-morph";
import { ApiSurfaceRow, Config } from "../../../../types/index.js";
import { firstExportDecls } from "../../../../utils/first-export-decls.js";
import { getDisplayName } from "../../../../utils/get-display-name.js";
import { classifyAngularFile } from "../classifiers/classify-import-role.js";
import { shortType } from "../../../../utils/short-type.js";
import { getTypeTargetNode } from "../../../../utils/get-type-target-node.js";

export function extractApiSurface(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): ApiSurfaceRow[] {
  return firstExportDecls(exported).map(({ exportName, decl }) => {
    const name = getDisplayName(exportName, decl);
    const target = getTypeTargetNode(decl);

    return {
      name,
      kind: classifyAngularFile(decl.getSourceFile()),
      type: shortType(checker.getTypeAtLocation(target).getText(target)),
    };
  });
}
