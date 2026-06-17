import type { SourceFile, ExportedDeclarations } from "ts-morph";
import { getDisplayName, normalizePath } from "cplint";
import type { Config, EntryPoint } from "cplint";
import { classifyNodeFile } from "../classifiers/classify-file.js";

export function extractEntryPoints(
  exported: ReadonlyMap<string, ExportedDeclarations[]>,
  file: SourceFile,
  _config: Config,
): EntryPoint[] {
  const rows: EntryPoint[] = [];
  const filePath = normalizePath(file.getFilePath());
  const kind = classifyNodeFile(file);

  for (const [exportName, decls] of exported.entries()) {
    const decl = decls[0];
    if (!decl) continue;

    const name = getDisplayName(exportName, decl);
    rows.push({ name, kind, file: filePath });
  }

  return rows;
}
