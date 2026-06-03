import { SyntaxKind } from "ts-morph";
import type { Node as MorphNode, SourceFile } from "ts-morph";
import type { Config } from "../../../types/index.js";
import { firstExportDecls } from "../../../utils/first-export-decls.js";
import { getReferenceNode } from "../../../utils/get-reference-node.js";
import { hasReferenceSearch } from "../../../utils/has-reference-search.js";
import { normalizePath } from "../../../utils/normalize-path.js";

export function extractChangeChecklist(
  sourceFile: SourceFile,
  exported: ReadonlyMap<string, MorphNode[]>,
  config: Config,
): string[] {
  const refs = new Set<string>();

  for (const { decl } of firstExportDecls(exported)) {
    const refNode = getReferenceNode(decl);
    if (!refNode || !hasReferenceSearch(refNode)) continue;

    for (const ref of refNode.findReferencesAsNodes()) {
      const filePath = ref.getSourceFile().getFilePath();
      if (filePath === sourceFile.getFilePath()) continue;
      if (filePath.includes("node_modules")) continue;
      refs.add(normalizePath(filePath));
      if (refs.size >= config.maxReferenceFiles) break;
    }

    if (refs.size >= config.maxReferenceFiles) break;
  }

  const checklist = refs.size
    ? [`review references: ${[...refs].join(", ")}`]
    : ["review dependent callers and tests before changing exported behavior"];

  const text = sourceFile.getFullText();

  // React-specific warnings
  if (text.includes("useContext") || text.includes("createContext")) {
    checklist.push(
      "context shape changed — all consumers using this context will be affected",
    );
  }

  const hasMemoDeps = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .some((c) =>
      ["useMemo", "useCallback", "useEffect"].includes(
        c.getExpression().getText(),
      ),
    );

  if (hasMemoDeps) {
    checklist.push(
      "verify dependency arrays in useMemo / useCallback / useEffect after changes",
    );
  }

  if (text.includes("forwardRef")) {
    checklist.push(
      "forwardRef used — verify ref contract is preserved after refactoring",
    );
  }

  return checklist;
}
