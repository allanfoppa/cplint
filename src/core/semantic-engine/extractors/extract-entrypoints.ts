import { SourceFile, Node as MorphNode } from "ts-morph";
import { Config, EntryPoint } from "../types/index.js";
import { normalizePath } from "../utils/normalize-path.js";
import { classifyDeclaration } from "../classifiers/classify-declaration.js";
import { getDisplayName } from "../utils/get-display-name.js";
import { firstExportDecls } from "../utils/first-export-decls.js";

export function extractEntryPoints(
  exported: ReadonlyMap<string, MorphNode[]>,
  sourceFile: SourceFile,
  config: Config,
): EntryPoint[] {
  return firstExportDecls(exported).map(({ exportName, decl }) => {
    const name = getDisplayName(exportName, decl);

    return {
      name,
      kind: classifyDeclaration(decl, name, config),
      file: normalizePath(sourceFile.getFilePath()),
    };
  });
}
