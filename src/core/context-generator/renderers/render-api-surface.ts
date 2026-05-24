import { ApiSurfaceRow } from "../../types/index.js";

export function renderApiSurface(rows: ApiSurfaceRow[]): string {
  if (!rows.length) return "- none";

  return rows
    .map((row) => `- ${row.name}: ${row.kind} | ${row.type}`)
    .join("\n");
}
