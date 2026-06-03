import type { StateShapeRow } from "../../types/index.js";

export function renderStateShape(rows: StateShapeRow[]): string {
  if (!rows.length) return "none";

  return rows
    .map((row) => {
      const header = `${row.name}:`;
      const fields = row.fields.length
        ? row.fields.map((f) => `${f.name}: ${f.type}`).join("\n")
        : "none";

      return `${header}\n${fields}`;
    })
    .join("\n");
}
