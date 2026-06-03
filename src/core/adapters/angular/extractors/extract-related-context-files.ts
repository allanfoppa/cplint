import fs from "node:fs";
import { SourceFile } from "ts-morph";
import { Config } from "../../../types/index.js";
import { getOutputPath } from "../../../utils/get-output-path.js";
import { normalizePath } from "../../../utils/normalize-path.js";

export function extractRelatedContextFiles(
  sourceFile: SourceFile,
  config: Config,
): string[] {
  const related = new Set<string>();

  for (const imp of sourceFile.getImportDeclarations()) {
    const importedSource = imp.getModuleSpecifierSourceFile();

    if (!importedSource) continue;

    if (importedSource.isFromExternalLibrary()) {
      continue;
    }

    const relatedPath = getOutputPath(importedSource.getFilePath(), config);

    if (fs.existsSync(relatedPath)) {
      related.add(normalizePath(relatedPath));
    }
  }

  return [...related].sort();
}
