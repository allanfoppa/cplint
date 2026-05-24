import type { SourceFile } from "ts-morph";
import type { Config } from "../../../../types/index.js";
import type { Rule, Violation } from "../../../types.js";
import { detectFeature } from "../../../../utils/detect-feature.js";

interface NoCrossFeatureImportConfig extends Config {
  rootPath: string[];
}

export const noCrossFeatureImport: Rule = {
  id: "no-cross-feature-import",
  severity: "error",
  description:
    "Feature slices must not import directly from other feature slices. " +
    "Cross-feature coupling increases token cost for LLMs and breaks vertical slice isolation.",

  check(file: SourceFile, config: NoCrossFeatureImportConfig): Violation[] {
    const filePath = file.getFilePath();
    const currentFeature = detectFeature(filePath, config.rootPath);

    // File is not inside a feature root — skip
    if (!currentFeature) return [];

    const violations: Violation[] = [];

    for (const imp of file.getImportDeclarations()) {
      const importedSourceFile = imp.getModuleSpecifierSourceFile();

      // Can't resolve the import — skip (external lib or unresolved path)
      if (!importedSourceFile) continue;

      // Skip external libraries
      if (importedSourceFile.isFromExternalLibrary()) continue;

      const importedPath = importedSourceFile.getFilePath();
      const importedFeature = detectFeature(importedPath, config.rootPath);

      // Not inside a feature root — shared/utils/etc — allowed
      if (!importedFeature) continue;

      // Same feature — allowed
      if (importedFeature === currentFeature) continue;

      violations.push({
        ruleId: "no-cross-feature-import",
        severity: "error",
        message: `Feature "${currentFeature}" imports directly from feature "${importedFeature}" (${importedPath}:${imp.getStartLineNumber()}).`,
        file: filePath,
        line: imp.getStartLineNumber(),
      });
    }

    return violations;
  },
};
