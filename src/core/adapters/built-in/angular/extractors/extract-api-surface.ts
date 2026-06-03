import type { Node as MorphNode, TypeChecker } from "ts-morph";
import type { ApiSurfaceRow, Config } from "../../../../types/index.js";
import { firstExportDecls } from "../../../../utils/first-export-decls.js";
import { getDisplayName } from "../../../../utils/get-display-name.js";
import { classifyAngularFile } from "../classifiers/classify-import-role.js";
import { shortType } from "../../../../utils/short-type.js";
import { getTypeTargetNode } from "../../../../utils/get-type-target-node.js";
import { buildApiRow } from "../../../../utils/api-surface-compat.js";

export function extractApiSurface(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): ApiSurfaceRow[] {
  return firstExportDecls(exported).map(({ exportName, decl }) => {
    const name = getDisplayName(exportName, decl);
    const target = getTypeTargetNode(decl);
    const kind = classifyAngularFile(decl.getSourceFile());
    const type = shortType(checker.getTypeAtLocation(target).getText(target));

    return buildApiRow({ name, kind, type });
  });
}
