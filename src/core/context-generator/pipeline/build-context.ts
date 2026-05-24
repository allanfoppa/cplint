import type { SourceFile, TypeChecker } from "ts-morph";
import type {
  CPLintAdapter,
  Config,
  SemanticContext,
} from "../../types/index.js";
import { normalizePath } from "../../utils/normalize-path.js";
import { humanizeTitle } from "../../utils/humanize-text.js";

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
  const title = humanizeTitle(sourceFile);
  const role = adapter.classify(sourceFile);
  const extracted = adapter.extract(sourceFile, checker, config);

  return {
    title,
    role,
    meta: {
      generated: new Date().toISOString().slice(0, 10),
      entry: normalizePath(sourceFile.getFilePath()),
      related: extracted.relatedContextFiles,
    },
    entryPoints: extracted.entryPoints,
    apiSurface: extracted.apiSurface,
    deps: extracted.deps,
    stateShape: extracted.stateShape,
    criticalFlow: extracted.criticalFlow,
    changeChecklist: extracted.changeChecklist,
  };
}
