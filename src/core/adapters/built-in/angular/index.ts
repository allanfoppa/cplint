import type { SourceFile, TypeChecker } from "ts-morph";
import type {
  CPLintAdapter,
  Config,
  ExtractedContext,
  FileRole,
} from "../../../types/index.js";

import { classifyAngularFile } from "./classifiers/classify-import-role.js";
import { extractApiSurface } from "./extractors/extract-api-surface.js";
import { extractChangeChecklist } from "./extractors/extract-change-checklist.js";
import { extractCriticalFlow } from "./extractors/extract-critical-flow.js";
import { extractDeps } from "./extractors/extract-deps.js";
import { extractEntryPoints } from "./extractors/extract-entrypoints.js";
import { extractRelatedContextFiles } from "./extractors/extract-related-context-files.js";
import { extractStateShape } from "./extractors/extract-state-shape.js";

export const AngularAdapter: CPLintAdapter = {
  name: "angular",

  classify(file: SourceFile): FileRole {
    return classifyAngularFile(file);
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
