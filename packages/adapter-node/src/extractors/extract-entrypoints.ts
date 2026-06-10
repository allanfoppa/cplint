import { Node } from "ts-morph";
import type { SourceFile, ExportedDeclarations } from "ts-morph";
import { getDisplayName, normalizePath } from "cplint";
import type { Config, EntryPoint } from "cplint";

export function extractEntryPoints(
  exported: ReadonlyMap<string, ExportedDeclarations[]>,
  file: SourceFile,
  _config: Config,
): EntryPoint[] {
  const rows: EntryPoint[] = [];
  const filePath = normalizePath(file.getFilePath());

  for (const [exportName, decls] of exported.entries()) {
    const decl = decls[0];
    if (!decl) continue;

    const name = getDisplayName(exportName, decl);
    const kind = resolveKind(decl);

    rows.push({ name, kind, file: filePath });
  }

  return rows;
}

function resolveKind(decl: ExportedDeclarations): string {
  if (Node.isClassDeclaration(decl)) return "class";
  if (Node.isFunctionDeclaration(decl)) return "function";
  if (Node.isVariableDeclaration(decl)) return "variable";
  if (Node.isInterfaceDeclaration(decl)) return "interface";
  if (Node.isTypeAliasDeclaration(decl)) return "type";
  if (Node.isEnumDeclaration(decl)) return "enum";
  return "unknown";
}
