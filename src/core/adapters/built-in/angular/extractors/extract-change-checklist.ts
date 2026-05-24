import { SourceFile, type Node as MorphNode } from "ts-morph";
import { Config } from "../../../../types/index.js";
import { firstExportDecls } from "../../../../utils/first-export-decls.js";
import { hasReferenceSearch } from "../../../../utils/has-reference-search.js";
import { normalizePath } from "../../../../utils/normalize-path.js";
import { getReferenceNode } from "../../../../utils/get-reference-node.js";

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
    return [
      "review dependent callers and tests before changing exported behavior",
    ];
  }

  return [`review references: ${[...refs].join(", ")}`];
}
