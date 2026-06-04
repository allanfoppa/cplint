import type { ApiSurfaceRow } from "../../types/index.js";

export function renderApiSurface(rows: ApiSurfaceRow[]): string {
  if (!rows.length) return "none";

  return rows
    .map((row) => {
      // Names for methods come with leading spaces from extractors ("  loadAll")
      // — trim before using as YAML key
      const key = row.name.trim();
      const safeSignature = row.signature.trim().replace(/"/g, "'");
      const flags = row.flags.join(", ");
      return `${key}:\n  signature: "${safeSignature}"\n  flags: [${flags}]`;
    })
    .join("\n");
}
