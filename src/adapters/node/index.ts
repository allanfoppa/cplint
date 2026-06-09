import type { SourceFile, TypeChecker } from "ts-morph";
import type {
  CPLintAdapter,
  Config,
  ExtractedContext,
  FileRole,
} from "../../core/types/index.js";

import { classifyNodeFile } from "./classifiers/classify-file.js";
import { extractApiSurface } from "./extractors/extract-api-surface.js";
import { extractChangeChecklist } from "./extractors/extract-change-checklist.js";
import { extractCriticalFlow } from "./extractors/extract-critical-flow.js";
import { extractDeps } from "./extractors/extract-deps.js";
import { extractEntryPoints } from "./extractors/extract-entrypoints.js";
import { extractRelatedContextFiles } from "./extractors/extract-related-context-files.js";
import { extractStateShape } from "./extractors/extract-state-shape.js";

/**
 * Default CPLint adapter for plain TypeScript / Node.js projects.
 *
 * No framework assumptions — works with any TS codebase.
 * Use as the fallback when no framework-specific adapter is configured.
 *
 * @example cplint.config.ts
 * import { NodeAdapter } from '@cplint/adapter-node';
 * export default { rootPath: ['src'], adapter: NodeAdapter }
 */
export const NodeAdapter: CPLintAdapter = {
  name: "node",

  classify(file: SourceFile): FileRole {
    return classifyNodeFile(file);
  },

  extract(
    file: SourceFile,
    checker: TypeChecker,
    config: Config,
  ): ExtractedContext {
    const exported = file.getExportedDeclarations();

    return {
      entryPoints: extractEntryPoints(exported, file, config),
      apiSurface: extractApiSurface(exported, checker, config),
      deps: extractDeps(file, config),
      stateShape: extractStateShape(file, exported, checker, config),
      criticalFlow: extractCriticalFlow(exported, checker, config),
      changeChecklist: extractChangeChecklist(file, exported, config),
      relatedContextFiles: extractRelatedContextFiles(file, config),
    };
  },
};
