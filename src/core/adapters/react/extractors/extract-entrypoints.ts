import type { Node as MorphNode, SourceFile } from "ts-morph";
import type { Config, EntryPoint } from "../../../types/index.js";
import { firstExportDecls } from "../../../utils/first-export-decls.js";
import { getDisplayName } from "../../../utils/get-display-name.js";
import { normalizePath } from "../../../utils/normalize-path.js";
import { classifyDeclaration } from "../classifiers/classify-declaration.js";

export function extractEntryPoints(
  exported: ReadonlyMap<string, MorphNode[]>,
  sourceFile: SourceFile,
  config: Config,
): EntryPoint[] {
  return firstExportDecls(exported).map(({ exportName, decl }) => ({
    name: getDisplayName(exportName, decl),
    kind: classifyDeclaration(decl, getDisplayName(exportName, decl), config),
    file: normalizePath(sourceFile.getFilePath()),
  }));
}
