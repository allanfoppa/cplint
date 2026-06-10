export type {
  CPLintAdapter,
  Config,
  ExtractedContext,
  FileRole,
  ApiSurfaceRow,
  StateShapeRow,
  DependencyRow,
  EntryPoint,
} from "./core/types/index.js";

export { getDisplayName } from "./core/utils/get-display-name.js";
export { shortType } from "./core/utils/short-type.js";
export { normalizePath } from "./core/utils/normalize-path.js";
export { buildApiRow } from "./core/utils/api-surface-compat.js";
export { getOutputPath } from "./core/utils/get-output-path.js";
export { addTypeSummary } from "./core/utils/add-type-summary.js";
export { firstExportDecls } from "./core/utils/first-export-decls.js";
export { getFunctionLikeNode } from "./core/utils/get-function-like-node.js";
export { pickPrimaryExport } from "./core/utils/pick-primary-export.js";
export { describeCall } from "./core/utils/describe-call.js";
export { isPrimitiveCall } from "./core/utils/is-primitive-call.js";
export { getTypeTargetNode } from "./core/utils/get-type-target-node.js";
export { getImportBindingNodes } from "./core/utils/get-import-binding-nodes.js";
export { isImportBindingUsedInFile } from "./core/utils/is-import-binding-used-in-file.js";
export { getReferenceNode } from "./core/utils/get-reference-node.js";
export { hasReferenceSearch } from "./core/utils/has-reference-search.js";
