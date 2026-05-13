import { SourceFile } from "ts-morph";
import { Config, DependencyRow } from "../types/index.js";
import { classifyImportRole } from "../classifiers/classify-import-role.js";
import { getImportBindingNodes } from "../utils/get-import-binding-nodes.js";
import { isImportBindingUsedInFile } from "../utils/is-import-binding-used-in-file.js";

export function extractDeps(
  sourceFile: SourceFile,
  config: Config,
): DependencyRow[] {
  const rows: DependencyRow[] = [];

  for (const imp of sourceFile.getImportDeclarations()) {
    if (imp.isTypeOnly()) continue;

    const symbols = getImportBindingNodes(imp)
      .filter((node) => isImportBindingUsedInFile(node, sourceFile))
      .map((node) => node.getText());

    if (!symbols.length) continue;

    rows.push({
      module: imp.getModuleSpecifierValue(),
      role: classifyImportRole(imp.getModuleSpecifierValue(), config),
      symbols,
    });
  }

  return rows;
}
