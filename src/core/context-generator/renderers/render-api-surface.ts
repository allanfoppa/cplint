import type { ApiSurfaceRow } from "../../types/index.js";

export function renderApiSurface(rows: ApiSurfaceRow[]): string {
  if (!rows.length) return "none";

  return rows
    .map((row) => {
      return `${row.name}:\n  signature: "${row.signature.trim().replace(/"/g, "'")}"\n  flags: [${row.flags.join(", ")}]`;
    })
    .join("\n");
}
