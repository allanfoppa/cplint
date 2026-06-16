import type { SourceFile, TypeChecker } from "ts-morph";
import type { CPLintAdapter, Config, SemanticContext } from "../types/index.js";
import { normalizePath } from "../utils/normalize-path.js";
import { buildSummary } from "../utils/add-type-summary.js";

export function buildContext({
  sourceFile,
  checker,
  config,
  adapter,
}: {
  sourceFile: SourceFile;
  checker: TypeChecker;
  config: Config;
  adapter: CPLintAdapter;
}): SemanticContext {
  const role = adapter.classify(sourceFile);
  const generated = new Date().toISOString().slice(0, 10);
  const entry = normalizePath(sourceFile.getFilePath());
  const {
    relatedContextFiles,
    entryPoints,
    apiSurface,
    deps,
    stateShape,
    criticalFlow,
    changeChecklist,
  } = adapter.extract(sourceFile, checker, config);
  const summary = buildSummary(role, apiSurface);

  return {
    role,
    summary,
    meta: {
      generated,
      entry,
      relatedContextFiles,
    },
    entryPoints,
    apiSurface,
    deps,
    stateShape,
    criticalFlow,
    changeChecklist,
  };
}
