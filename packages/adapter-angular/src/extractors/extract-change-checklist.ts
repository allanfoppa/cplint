import { SourceFile, type Node as MorphNode } from "ts-morph";
import { Config } from "../../../cplint/src/core/types/index.js";
import { firstExportDecls } from "../../../cplint/src/core/utils/first-export-decls.js";
import { hasReferenceSearch } from "../../../cplint/src/core/utils/has-reference-search.js";
import { normalizePath } from "../../../cplint/src/core/utils/normalize-path.js";
import { getReferenceNode } from "../../../cplint/src/core/utils/get-reference-node.js";

export function extractChangeChecklist(
  sourceFile: SourceFile,
  exported: ReadonlyMap<string, MorphNode[]>,
  config: Config,
): string[] {
  const refs = new Set<string>();

  for (const { decl } of firstExportDecls(exported)) {
    const refNode = getReferenceNode(decl);

    if (!refNode || !hasReferenceSearch(refNode)) {
      continue;
    }

    for (const ref of refNode.findReferencesAsNodes()) {
      const filePath = ref.getSourceFile().getFilePath();

      if (filePath === sourceFile.getFilePath()) {
        continue;
      }

      if (filePath.includes("node_modules")) {
        continue;
      }

      refs.add(normalizePath(filePath));

      if (refs.size >= config.maxReferenceFiles) {
        break;
      }
    }

    if (refs.size >= config.maxReferenceFiles) {
      break;
    }
  }

  if (!refs.size) {
    return [];
  }

  return [`review references: ${[...refs].join(", ")}`];
}
