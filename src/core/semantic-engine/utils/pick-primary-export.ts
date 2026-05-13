import { type Node as MorphNode } from "ts-morph";
import { ExportDeclRow } from "../types/index.js";
import { firstExportDecls } from "./first-export-decls.js";
import { getDisplayName } from "./get-display-name.js";

export function pickPrimaryExport(
  exported: ReadonlyMap<string, MorphNode[]>,
): ExportDeclRow | null {
  const rows = firstExportDecls(exported);

  if (!rows.length) return null;

  rows.sort((a, b) => {
    const aName = getDisplayName(a.exportName, a.decl);
    const bName = getDisplayName(b.exportName, b.decl);
    const aScore = a.exportName === "default" ? 2 : 1;
    const bScore = b.exportName === "default" ? 2 : 1;

    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return aName.localeCompare(bName);
  });

  return rows[0];
}
