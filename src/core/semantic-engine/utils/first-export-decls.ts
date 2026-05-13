import type { Node as MorphNode } from "ts-morph";
import { ExportDeclRow } from "../types/index.js";

export function firstExportDecls(
  exported: ReadonlyMap<string, MorphNode[]>,
): ExportDeclRow[] {
  const rows: ExportDeclRow[] = [];

  for (const [exportName, decls] of exported.entries()) {
    if (!decls.length) continue;

    rows.push({
      exportName,
      decl: decls[0],
    });
  }

  return rows;
}
