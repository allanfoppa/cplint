import type { LintFile, LintRule, LintViolation } from "../../types.js";
import { detectFeature } from "../../../utils/detect-feature.js";

export const noCrossFeatureImport: LintRule = {
  name: "no-cross-feature-import",
  severity: "error",

  run(file: LintFile): LintViolation[] {
    const violations: LintViolation[] = [];

    const entryMatch = file.autoBlocks["meta"]?.match(/^entry:\s*(.+)$/m);
    if (!entryMatch) return [];

    const entryPath = entryMatch[1].trim();
    const currentFeature = detectFeatureFromPath(entryPath);
    if (!currentFeature) return [];

    const depsBlock = file.autoBlocks["deps"] ?? "";
    if (!depsBlock || depsBlock.trim() === "- none") return [];

    for (const line of depsBlock.split("\n")) {
      const match = line.match(/^-\s+([^:]+):/);
      if (!match) continue;

      const importedPath = match[1].trim();
      const importedFeature = detectFeatureFromPath(importedPath);

      if (!importedFeature) continue;
      if (importedFeature === currentFeature) continue;

      violations.push({
        rule: "no-cross-feature-import",
        severity: "error",
        file: file.path,
        message:
          `Feature "${currentFeature}" imports directly from feature "${importedFeature}" ` +
          `(${importedPath}). Cross-feature imports increase LLM token cost and break slice isolation.`,
      });
    }

    return violations;
  },
};

function detectFeatureFromPath(filePath: string): string | null {
  const match = filePath.match(/(?:features|pages|modules)\/([^/]+)\//);
  return match?.[1] ?? null;
}
