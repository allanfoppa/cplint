import type { ApiSurfaceRow } from "../../types/index.js";

export function renderApiSurface(rows: ApiSurfaceRow[]): string {
  if (!rows.length) return "- none";

  return rows
    .map((row) => {
      const flags = row.flags.length ? `  [${row.flags.join(", ")}]` : "";
      return `- ${row.signature}${flags}`;
    })
    .join("\n");
}
