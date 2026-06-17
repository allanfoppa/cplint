import type { Node as MorphNode, SourceFile } from "ts-morph";
import type { Config, EntryPoint } from "cplint";
import { firstExportDecls, getDisplayName, normalizePath } from "cplint";
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
