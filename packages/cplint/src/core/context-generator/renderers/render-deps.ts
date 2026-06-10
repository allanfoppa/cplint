import type { DependencyRow } from "../../types/index.js";

export function renderDeps(rows: DependencyRow[]): string {
  if (!rows.length) return "none";

  return rows
    .map((row) => {
      const safeSymbols = row.symbols.join(", ");
      return `${row.module}:\n  role: ${row.role}\n  symbols: [${safeSymbols}]`;
    })
    .join("\n");
}
