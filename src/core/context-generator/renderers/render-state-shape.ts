import type { StateShapeRow } from "../../types/index.js";

export function renderStateShape(rows: StateShapeRow[]): string {
  if (!rows.length) return "none";

  return rows
    .map((row) => {
      const key = row.name.trim();
      if (!row.fields.length) return `${key}: none`;

      const fields = row.fields
        .map((f) => `  ${f.name}: "${f.type.replace(/"/g, "'")}"`)
        .join("\n");

      return `${key}:\n${fields}`;
    })
    .join("\n");
}
