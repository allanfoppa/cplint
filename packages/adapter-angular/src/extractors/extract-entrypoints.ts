import { SourceFile, Node as MorphNode } from "ts-morph";
import {
  Config,
  EntryPoint,
  normalizePath,
  getDisplayName,
  firstExportDecls,
} from "cplint";
import { classifyDeclaration } from "../classifiers/classify-declaration.js";

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
