import { DependencyRow } from "../../types/index.js";

export function renderDeps(rows: DependencyRow[]): string {
  if (!rows.length) return "- none";

  return rows
    .map((row) => `- ${row.module}: ${row.role} | ${row.symbols.join(", ")}`)
    .join("\n");
}
