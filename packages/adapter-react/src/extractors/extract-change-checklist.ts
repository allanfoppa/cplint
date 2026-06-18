import type { Node as MorphNode, SourceFile } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import type { Config } from "cplint";
import {
  firstExportDecls,
  getReferenceNode,
  hasReferenceSearch,
  normalizePath,
} from "cplint";

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
    : [];

  const text = sourceFile.getFullText();

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
