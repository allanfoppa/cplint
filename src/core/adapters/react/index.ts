import type { SourceFile, TypeChecker } from "ts-morph";
import type {
  CPLintAdapter,
  Config,
  ExtractedContext,
  FileRole,
} from "../../types/index.js";

import { classifyReactFile } from "./classifiers/classify-file.js";
import { extractApiSurface } from "./extractors/extract-api-surface.js";
import { extractChangeChecklist } from "./extractors/extract-change-checklist.js";
import { extractCriticalFlow } from "./extractors/extract-critical-flow.js";
import { extractDeps } from "./extractors/extract-deps.js";
import { extractEntryPoints } from "./extractors/extract-entrypoints.js";
import { extractRelatedContextFiles } from "./extractors/extract-related-context-files.js";
import { extractStateShape } from "./extractors/extract-state-shape.js";

/**
 * CPLint adapter for React projects (Vite, Next.js, CRA, Remix).
 *
 * Understands hooks (useX), JSX components, context providers,
 * and state libraries (Zustand, Redux Toolkit, Jotai, Recoil).
 *
 * @example cplint.config.ts
 * import { ReactAdapter } from '@cplint/adapter-react';
 * export default { rootPath: ['src'], adapter: ReactAdapter }
 */
export const ReactAdapter: CPLintAdapter = {
  name: "react",

  classify(file: SourceFile): FileRole {
    return classifyReactFile(file);
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
